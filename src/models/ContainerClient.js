const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const { InvalidGeneratedCodeError } = require('../errors/FunctionErrors');

class ContainerClient {
    constructor(dockerImage = 'node:18-slim') {
        this.dockerImage = dockerImage;
        this.containers = new Map();
        this.portCounter = 3001;
        this.containersDir = path.join(process.cwd(), 'data', 'containers');
        this.networkName = 'llmfunction-network';
        this.#initializeContainersDir();
        this.#initializeNetwork();
        console.log('ContainerClient initialized');
    }

    async #initializeContainersDir() {
        try {
            await fs.mkdir(this.containersDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create containers directory:', error);
        }
    }

    async #loadContainerInfo(functionId) {
        try {
            const containerFile = path.join(this.containersDir, `${functionId}.json`);
            const data = await fs.readFile(containerFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    async #saveContainerInfo(functionId, containerInfo) {
        try {
            const filePath = path.join(this.containersDir, `${functionId}.json`);
            await fs.writeFile(filePath, JSON.stringify(containerInfo, null, 2));
            console.log(`Saved container info to ${filePath}`);
        } catch (error) {
            console.error(`Failed to save container info for ${functionId}:`, error);
            throw error;
        }
    }

    async #removeContainerInfo(functionId) {
        try {
            const containerFile = path.join(this.containersDir, `${functionId}.json`);
            await fs.unlink(containerFile);
        } catch (error) {
            // Ignorera om filen inte finns
        }
    }

    async #initializeNetwork() {
        // Skapa Docker-nätverket om det inte finns
        const create = spawn('docker', ['network', 'create', this.networkName]);
        create.on('error', (err) => {
            if (err.code !== 'EEXIST') {
                console.error('Failed to create network:', err);
            }
        });
    }

    async #getContainer(functionId) {
        console.log(`[ContainerClient] Getting container info for function ${functionId}`);
        
        // Försök ladda container-information från fil
        const containerInfo = await this.#loadContainerInfo(functionId);
        if (!containerInfo) {
            console.log(`[ContainerClient] No container info found in file for function ${functionId}`);
            return null;
        }

        console.log(`[ContainerClient] Found container info in file:`, containerInfo);

        // Kolla med Docker om containern fortfarande kör
        try {
            console.log(`[ContainerClient] Checking if container is running: function-${functionId}`);
            const inspect = await new Promise((resolve, reject) => {
                const inspect = spawn('docker', ['ps', '--filter', `name=function-${functionId}`, '--format', '{{.ID}}']);
                let output = '';
                let error = '';
                inspect.stdout.on('data', (data) => output += data.toString());
                inspect.stderr.on('data', (data) => error += data.toString());
                inspect.on('close', (code) => {
                    if (code !== 0) {
                        console.error(`[ContainerClient] Failed to inspect container: ${error}`);
                        reject(new Error(`Failed to inspect container: ${error}`));
                    } else {
                        resolve(output.trim());
                    }
                });
            });

            // Om containern inte hittades, ta bort container-informationen
            if (!inspect) {
                console.log(`[ContainerClient] Container not running, removing container info`);
                await this.#removeContainerInfo(functionId);
                return null;
            }

            console.log(`[ContainerClient] Container is running with ID: ${inspect}`);

            // Uppdatera containerId om den har ändrats
            containerInfo.containerId = inspect;
            return containerInfo;
        } catch (error) {
            console.error(`[ContainerClient] Error checking container status:`, error);
            await this.#removeContainerInfo(functionId);
            return null;
        }
    }

    async #findAvailablePort() {
        // Läs alla container-filer för att se vilka portar som används
        const usedPorts = new Set();
        try {
            const files = await fs.readdir(this.containersDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = await fs.readFile(path.join(this.containersDir, file), 'utf8');
                    const containerInfo = JSON.parse(data);
                    if (containerInfo.port) {
                        usedPorts.add(containerInfo.port);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to read container files:', error);
        }

        // Hitta första lediga porten från 3001 och uppåt
        let port = 3001;
        while (port < 65535) {
            if (!usedPorts.has(port)) {
                // Kolla om porten faktiskt är ledig
                const isPortAvailable = await new Promise((resolve) => {
                    const check = spawn('netstat', ['-an', '|', 'findstr', `:${port}`]);
                    let output = '';
                    let error = '';
                    check.stdout.on('data', (data) => output += data.toString());
                    check.stderr.on('data', (data) => error += data.toString());
                    check.on('close', (code) => {
                        // Om porten inte hittas (code !== 0) är den ledig
                        resolve(code !== 0);
                    });
                });
                
                if (isPortAvailable) {
                    return port;
                }
            }
            port++;
        }
        throw new Error('No available ports found');
    }

    async #createContainer(sourceCode, functionId) {
        console.log(`[ContainerClient] Creating container for function ${functionId}`);
        
        // Kolla om containern redan finns och kör
        let containerInfo = await this.#getContainer(functionId);
        
        // Om containern finns och kör, kolla om källkoden har ändrats
        if (containerInfo) {
            if (containerInfo.sourceCode === sourceCode) {
                console.log(`[ContainerClient] Reusing existing container for function ${functionId}`);
                return containerInfo;
            }
            console.log(`[ContainerClient] Source code changed for function ${functionId}, removing old container`);
            await this.removeContainer(functionId);
        }

        // Skapa ett unikt namn för containern
        const containerName = `function-${functionId}`;
        const port = await this.#findAvailablePort();

        // Skapa en temporär mapp för containern
        const tempDir = path.join(process.cwd(), 'temp', functionId);
        await fs.mkdir(tempDir, { recursive: true });

        // Skapa package.json
        const packageJson = {
            name: functionId,
            version: '1.0.0',
            dependencies: {
                "express": "^4.18.2",
                "body-parser": "^1.20.2"
            }
        };
        await fs.writeFile(
            path.join(tempDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Skapa server.js med källkoden och API endpoint
        const serverCode = `
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.sendStatus(200);
});

// Debug endpoint för att se vad som finns i servern
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        endpoints: ['/health', '/run'],
        message: 'Send POST request to /run with your input data'
    });
});

// Huvudfunktionen som ska köras
const runFunction = (inputData) => {
    try {
        console.log('Running function with input:', JSON.stringify(inputData, null, 2));
        
        // Extrahera input från request body
        const input = inputData.input ? inputData.input : inputData;
        console.log('Parsed input:', JSON.stringify(input, null, 2));

        // Kör den genererade koden
        const functionResult = (() => {
            ${sourceCode}
            return result;
        })();

        // Kontrollera om result är definierad
        if (typeof functionResult === 'undefined') {
            throw new Error('Function did not return a result. Make sure to set the "result" variable.');
        }

        console.log('Function result:', JSON.stringify(functionResult, null, 2));
        return functionResult;
    } catch (error) {
        console.error('Error in function:', error);
        throw error;
    }
};

// API endpoint för att köra funktionen
app.post('/run', (req, res) => {
    console.log('Received POST request to /run');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
        const result = runFunction(req.body);
        console.log('Sending response:', JSON.stringify(result, null, 2));
        res.json(result);
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack,
            details: {
                input: req.body,
                sourceCode: ${JSON.stringify(sourceCode)}
            }
        });
    }
});

const port = process.env.PORT;
app.listen(port, '0.0.0.0', () => {
    console.log(\`Server running on port \${port}\`);
    console.log('Available endpoints:');
    console.log('  GET  /        - Show server info');
    console.log('  GET  /health  - Health check');
    console.log('  POST /run     - Run function with input');
    console.log('Source code to run:');
    console.log(${JSON.stringify(sourceCode)});
});
`;

        await fs.writeFile(
            path.join(tempDir, 'server.js'),
            serverCode
        );

        // Skapa Dockerfile för långlivad container
        const dockerfile = `
FROM ${this.dockerImage}
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=${port}
EXPOSE ${port}
CMD ["node", "server.js"]
`;
        await fs.writeFile(
            path.join(tempDir, 'Dockerfile'),
            dockerfile
        );

        // Skapa containerInfo med all nödvändig information
        containerInfo = {
            id: functionId,
            imageName: containerName,
            containerName: containerName,
            tempDir: tempDir,
            port: port,
            sourceCode: sourceCode
        };

        try {
            // Spara container-informationen till fil INNAN vi försöker starta containern
            await this.#saveContainerInfo(functionId, containerInfo);
            console.log(`[ContainerClient] Saved container info to file before starting container for function ${functionId}`);

            // Bygg och starta containern
            console.log(`[ContainerClient] Building image for function ${functionId}`);
            await this.#buildImage(containerInfo);
            
            console.log(`[ContainerClient] Starting container for function ${functionId}`);
            await this.#startContainer(containerInfo);
            
            console.log(`[ContainerClient] Container started successfully for function ${functionId}`);

            // Vänta lite extra för att vara säker på att containern är redo
            console.log('[ContainerClient] Waiting for container to be fully ready...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Gör ett test-anrop för att verifiera att containern svarar
            try {
                console.log(`[ContainerClient] Testing health endpoint at http://localhost:${containerInfo.port}/health`);
                await axios.get(`http://localhost:${containerInfo.port}/health`);
                console.log('[ContainerClient] Container verified and ready to accept requests');
            } catch (err) {
                console.error('[ContainerClient] Container health check failed:', err.message);
                throw new Error('Container is not responding to health checks');
            }

            return containerInfo;
        } catch (error) {
            console.error('[ContainerClient] Failed to create container:', error);
            // Om containern misslyckas, ta bort container-informationen
            await this.#removeContainerInfo(functionId);
            throw error;
        }
    }

    async #buildImage(containerInfo) {
        console.log(`[ContainerClient] Building Docker image for function ${containerInfo.id}`);
        return new Promise((resolve, reject) => {
            const build = spawn('docker', [
                'build',
                '-t', containerInfo.imageName,
                containerInfo.tempDir
            ]);

            let buildOutput = '';
            let buildError = '';

            build.stdout.on('data', (data) => {
                const output = data.toString();
                buildOutput += output;
                console.log(`[ContainerClient] Build output: ${output.trim()}`);
            });

            build.stderr.on('data', (data) => {
                const error = data.toString();
                buildError += error;
                console.error(`[ContainerClient] Build error: ${error.trim()}`);
            });

            build.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[ContainerClient] Docker build failed with code ${code}`);
                    console.error(`[ContainerClient] Build output: ${buildOutput}`);
                    console.error(`[ContainerClient] Build error: ${buildError}`);
                    reject(new Error(`Docker build failed with code ${code}\nOutput: ${buildOutput}\nError: ${buildError}`));
                    return;
                }
                console.log(`[ContainerClient] Docker image built successfully: ${containerInfo.imageName}`);
                resolve();
            });
        });
    }

    async #startContainer(containerInfo) {
        return new Promise((resolve, reject) => {
            console.log(`Starting container ${containerInfo.containerName} on port ${containerInfo.port}`);
            
            // Starta containern direkt i bakgrunden
            const run = spawn('docker', [
                'run',
                '-d',  // Kör i bakgrunden
                '--rm',  // Ta bort containern när den stoppas
                '--name', containerInfo.containerName,
                '-p', `${containerInfo.port}:${containerInfo.port}`,
                '-e', `PORT=${containerInfo.port}`,
                containerInfo.imageName
            ]);

            let output = '';
            let error = '';

            run.stdout.on('data', (data) => {
                output += data.toString();
                console.log('Container output:', data.toString());
            });

            run.stderr.on('data', (data) => {
                error += data.toString();
                console.error('Container error:', data.toString());
            });

            run.on('close', async (code) => {
                if (code !== 0) {
                    reject(new Error(`Failed to start container: ${error}`));
                    return;
                }
                containerInfo.containerId = output.trim();
                console.log(`Container started with ID: ${containerInfo.containerId}`);

                try {
                    await this.#waitForContainer(containerInfo);
                    console.log(`Container ${containerInfo.containerName} is ready`);
                    resolve();
                } catch (err) {
                    // Propagera InvalidGeneratedCodeError direkt
                    if (err instanceof InvalidGeneratedCodeError) {
                        reject(err);
                    } else {
                        reject(new Error(`Container failed to become ready: ${err.message}`));
                    }
                }
            });
        });
    }

    async #waitForContainer(containerInfo) {
        const maxRetries = 30; // Max antal försök
        const retryDelay = 1000; // 1 sekund mellan varje försök
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`[ContainerClient] Waiting for container to be ready (attempt ${i + 1}/${maxRetries})`);
                
                // Kolla om containern fortfarande finns
                const containerExists = await new Promise((resolve, reject) => {
                    const ps = spawn('docker', ['ps', '-a', '--filter', `id=${containerInfo.containerId}`, '--format', '{{.ID}}']);
                    let output = '';
                    let error = '';
                    ps.stdout.on('data', (data) => output += data.toString());
                    ps.stderr.on('data', (data) => error += data.toString());
                    ps.on('close', (code) => {
                        if (code !== 0) {
                            reject(new Error(`Failed to check container existence: ${error}`));
                        } else {
                            resolve(output.trim() !== '');
                        }
                    });
                });

                if (!containerExists) {
                    // Om containern inte finns, kasta InvalidGeneratedCodeError direkt
                    throw new InvalidGeneratedCodeError(
                        'Container crashed due to invalid generated code',
                        containerInfo.sourceCode,
                        'Container was removed before logs could be retrieved'
                    );
                }

                // Kolla om containern kör
                const inspect = await new Promise((resolve, reject) => {
                    const inspect = spawn('docker', ['inspect', containerInfo.containerId]);
                    let output = '';
                    let error = '';
                    inspect.stdout.on('data', (data) => output += data.toString());
                    inspect.stderr.on('data', (data) => error += data.toString());
                    inspect.on('close', (code) => {
                        if (code !== 0) {
                            console.error(`[ContainerClient] Failed to inspect container: ${error}`);
                            reject(new Error(`Failed to inspect container: ${error}`));
                        } else {
                            try {
                                resolve(JSON.parse(output));
                            } catch (err) {
                                reject(new Error(`Failed to parse container info: ${err.message}`));
                            }
                        }
                    });
                });

                // Kolla om containern är "running"
                const state = inspect[0]?.State;
                if (!state) {
                    console.log(`[ContainerClient] No state information available for container`);
                    throw new Error('Container state not available');
                }

                if (state.Status === 'running') {
                    // Försök göra ett test-anrop till health endpoint
                    try {
                        console.log(`[ContainerClient] Testing health endpoint at http://localhost:${containerInfo.port}/health`);
                        const response = await axios.get(`http://localhost:${containerInfo.port}/health`, {
                            timeout: 5000 // 5 sekunders timeout
                        });
                        if (response.status === 200) {
                            console.log('[ContainerClient] Container is ready and responding to health checks');
                            return;
                        }
                    } catch (err) {
                        console.log(`[ContainerClient] Health check failed (attempt ${i + 1}):`, err.message);
                        // Om containern inte svarar, kolla om den fortfarande kör
                        if (state.Status !== 'running') {
                            throw new Error(`Container is not running (status: ${state.Status})`);
                        }
                    }
                } else if (state.Status === 'exited' || state.Status === 'removing') {
                    // Om containern har avslutats eller håller på att tas bort, hämta loggarna direkt
                    const logs = await new Promise((resolve, reject) => {
                        const logs = spawn('docker', ['logs', containerInfo.containerId]);
                        let output = '';
                        let error = '';
                        logs.stdout.on('data', (data) => output += data.toString());
                        logs.stderr.on('data', (data) => error += data.toString());
                        logs.on('close', (code) => {
                            if (code !== 0) {
                                reject(new Error(`Failed to get container logs: ${error}`));
                            } else {
                                resolve(output);
                            }
                        });
                    });
                    console.error(`[ContainerClient] Container ${state.Status}. Logs:\n${logs}`);
                    
                    throw new InvalidGeneratedCodeError(
                        'Container crashed due to invalid generated code',
                        containerInfo.sourceCode,
                        logs
                    );
                }
            } catch (err) {
                console.log(`[ContainerClient] Container check failed (attempt ${i + 1}):`, err.message);
                // Om felet är InvalidGeneratedCodeError eller containern inte finns, kasta felet direkt
                if (err instanceof InvalidGeneratedCodeError || err.message.includes('Container was removed')) {
                    throw err;
                }
                // Om det är sista försöket, kasta felet
                if (i === maxRetries - 1) {
                    throw err;
                }
            }

            // Vänta innan nästa försök
            console.log(`[ContainerClient] Waiting ${retryDelay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        throw new Error('Container failed to become ready in time');
    }

    async #runContainer(containerInfo, input) {
        console.log(`Running function in container ${containerInfo.containerName} on port ${containerInfo.port}`);
        console.log('Input:', JSON.stringify(input, null, 2));
        
        try {
            const url = `http://localhost:${containerInfo.port}/run`;
            console.log(`Making POST request to ${url}`);
            
            const response = await axios.post(url, input, {
                timeout: 10000, // 10 sekunders timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response data:', JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error) {
            console.error('Error running function:', error.message);
            
            // Hantera runtime-fel från containern (500-svar med felmeddelande)
            if (error.response && error.response.status === 500) {
                console.log('Container returned runtime error:', error.response.data);
                return error.response.data;
            }
            
            // Hantera nätverksfel eller andra infrastrukturproblem
            if (error.request) {
                console.error('No response received:', error.request);
                throw new Error('No response received from container');
            }
            
            // Hantera andra fel
            throw new Error(`Failed to execute function: ${error.message}`);
        }
    }

    async removeContainer(functionId) {
        console.log(`[ContainerClient] Starting container removal for function ${functionId}`);
        
        try {
            // Försök hämta container-information
            const containerInfo = await this.#getContainer(functionId);
            if (!containerInfo) {
                console.log(`[ContainerClient] No container found for function ${functionId}`);
                return;
            }

            console.log(`[ContainerClient] Found container info:`, {
                containerId: containerInfo.containerId,
                containerName: containerInfo.containerName,
                imageName: containerInfo.imageName
            });

            // Stoppa containern om den kör
            if (containerInfo.containerId) {
                console.log(`[ContainerClient] Stopping container ${containerInfo.containerId}`);
                await new Promise((resolve, reject) => {
                    const stop = spawn('docker', ['stop', containerInfo.containerName]);
                    let error = '';
                    stop.stderr.on('data', (data) => error += data.toString());
                    stop.on('close', (code) => {
                        if (code !== 0) {
                            console.error(`[ContainerClient] Failed to stop container: ${error}`);
                            reject(new Error(`Failed to stop container: ${error}`));
                        } else {
                            console.log(`[ContainerClient] Successfully stopped container ${containerInfo.containerId}`);
                            resolve();
                        }
                    });
                });
            }

            // Ta bort Docker-imagen
            console.log(`[ContainerClient] Removing image ${containerInfo.imageName}`);
            await new Promise((resolve, reject) => {
                const remove = spawn('docker', ['rmi', '-f', containerInfo.imageName]);
                let error = '';
                remove.stderr.on('data', (data) => error += data.toString());
                remove.on('close', (code) => {
                    if (code !== 0) {
                        console.error(`[ContainerClient] Failed to remove image: ${error}`);
                        reject(new Error(`Failed to remove image: ${error}`));
                    } else {
                        console.log(`[ContainerClient] Successfully removed image ${containerInfo.imageName}`);
                        resolve();
                    }
                });
            });

            // Ta bort temporär mapp
            try {
                console.log(`[ContainerClient] Removing temporary directory ${containerInfo.tempDir}`);
                await fs.rm(containerInfo.tempDir, { recursive: true, force: true });
                console.log(`[ContainerClient] Successfully removed temporary directory`);
            } catch (error) {
                console.error(`[ContainerClient] Failed to cleanup temporary directory:`, error);
                throw error;
            }

            // Ta bort container-informationen
            console.log(`[ContainerClient] Removing container info for function ${functionId}`);
            await this.#removeContainerInfo(functionId);
            
            console.log(`[ContainerClient] Successfully completed container removal for function ${functionId}`);
        } catch (error) {
            console.error(`[ContainerClient] Error during container removal:`, error);
            throw error;
        }
    }

    async execute(sourceCode, functionId, input) {
        let containerInfo = await this.#getContainer(functionId);
        
        // Om containern inte finns eller har ändrad källkod, skapa en ny
        if (!containerInfo || containerInfo.sourceCode !== sourceCode) {
            // Om det finns en gammal container, ta bort den först
            if (containerInfo) {
                await this.removeContainer(functionId);
            }
            containerInfo = await this.#createContainer(sourceCode, functionId);
            containerInfo.sourceCode = sourceCode; // Spara källkoden för framtida jämförelser
        }
        
        return await this.#runContainer(containerInfo, input);
    }
}

module.exports = ContainerClient; 