const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

class ContainerClient {
    constructor(dockerImage = 'node:18-slim') {
        this.dockerImage = dockerImage;
        this.containers = new Map();
        this.portCounter = 3001;
        this.containersDir = path.join(process.cwd(), 'data', 'containers');
        this.networkName = 'llmfunction-network';
        this.initializeContainersDir();
        this.initializeNetwork();
    }

    async initializeContainersDir() {
        try {
            await fs.mkdir(this.containersDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create containers directory:', error);
        }
    }

    async loadContainerInfo(functionId) {
        try {
            const containerFile = path.join(this.containersDir, `${functionId}.json`);
            const data = await fs.readFile(containerFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    async saveContainerInfo(functionId, containerInfo) {
        try {
            const filePath = path.join(this.containersDir, `${functionId}.json`);
            await fs.writeFile(filePath, JSON.stringify(containerInfo, null, 2));
            console.log(`Saved container info to ${filePath}`);
        } catch (error) {
            console.error(`Failed to save container info for ${functionId}:`, error);
            throw error;
        }
    }

    async removeContainerInfo(functionId) {
        try {
            const containerFile = path.join(this.containersDir, `${functionId}.json`);
            await fs.unlink(containerFile);
        } catch (error) {
            // Ignorera om filen inte finns
        }
    }

    async initializeNetwork() {
        // Skapa Docker-nätverket om det inte finns
        const create = spawn('docker', ['network', 'create', this.networkName]);
        create.on('error', (err) => {
            if (err.code !== 'EEXIST') {
                console.error('Failed to create network:', err);
            }
        });
    }

    async getContainer(functionId) {
        // Försök ladda container-information från fil
        const containerInfo = await this.loadContainerInfo(functionId);
        if (!containerInfo) return null;

        // Kolla med Docker om containern fortfarande kör
        try {
            const inspect = await new Promise((resolve, reject) => {
                const inspect = spawn('docker', ['ps', '--filter', `name=function-${functionId}`, '--format', '{{.ID}}']);
                let output = '';
                inspect.stdout.on('data', (data) => output += data);
                inspect.on('close', (code) => {
                    if (code === 0) {
                        resolve(output.trim());
                    } else {
                        reject(new Error('Failed to inspect container'));
                    }
                });
            });

            // Om containern inte hittades, ta bort container-informationen
            if (!inspect) {
                await this.removeContainerInfo(functionId);
                return null;
            }

            // Uppdatera containerId om den har ändrats
            containerInfo.containerId = inspect;
            return containerInfo;
        } catch (error) {
            console.error('Error checking container status:', error);
            await this.removeContainerInfo(functionId);
            return null;
        }
    }

    async createContainer(sourceCode, functionId) {
        // Kolla om containern redan finns och kör
        let containerInfo = await this.getContainer(functionId);
        
        // Om containern finns och kör, kolla om källkoden har ändrats
        if (containerInfo) {
            if (containerInfo.sourceCode === sourceCode) {
                console.log(`Reusing existing container for function ${functionId}`);
                return containerInfo;
            }
            console.log(`Source code changed for function ${functionId}, removing old container`);
            await this.removeContainer(functionId);
        }

        // Skapa ett unikt namn för containern
        const containerName = `function-${functionId}`;
        const port = this.portCounter++;

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
            await this.saveContainerInfo(functionId, containerInfo);
            console.log(`Saved container info to file before starting container for function ${functionId}`);

            await this.buildImage(containerInfo);
            await this.startContainer(containerInfo);
            console.log(`Created and started container for function ${functionId}`);

            // Vänta lite extra för att vara säker på att containern är redo
            console.log('Waiting for container to be fully ready...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Gör ett test-anrop för att verifiera att containern svarar
            try {
                await axios.get(`http://localhost:${containerInfo.port}/health`);
                console.log('Container verified and ready to accept requests');
            } catch (err) {
                throw new Error('Container is not responding to health checks');
            }

            return containerInfo;
        } catch (error) {
            console.error('Failed to create container:', error);
            // Om containern misslyckas, ta bort container-informationen
            await this.removeContainerInfo(functionId);
            throw error;
        }
    }

    async buildImage(containerInfo) {
        return new Promise((resolve, reject) => {
            const build = spawn('docker', [
                'build',
                '-t', containerInfo.imageName,
                containerInfo.tempDir
            ]);

            let buildOutput = '';
            let buildError = '';

            build.stdout.on('data', (data) => {
                buildOutput += data.toString();
            });

            build.stderr.on('data', (data) => {
                buildError += data.toString();
            });

            build.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Docker build failed with code ${code}\nOutput: ${buildOutput}\nError: ${buildError}`));
                    return;
                }
                resolve();
            });
        });
    }

    async startContainer(containerInfo) {
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
                    await this.waitForContainer(containerInfo);
                    console.log(`Container ${containerInfo.containerName} is ready`);
                    resolve();
                } catch (err) {
                    reject(new Error(`Container failed to become ready: ${err.message}`));
                }
            });
        });
    }

    async waitForContainer(containerInfo) {
        const maxRetries = 30; // Max antal försök
        const retryDelay = 1000; // 1 sekund mellan varje försök
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`Waiting for container to be ready (attempt ${i + 1}/${maxRetries})`);
                
                // Kolla om containern kör
                const inspect = await new Promise((resolve, reject) => {
                    const inspect = spawn('docker', ['inspect', containerInfo.containerId]);
                    let output = '';
                    inspect.stdout.on('data', (data) => output += data);
                    inspect.on('close', (code) => {
                        if (code === 0) {
                            resolve(JSON.parse(output));
                        } else {
                            reject(new Error('Failed to inspect container'));
                        }
                    });
                });

                // Kolla om containern är "running"
                const state = inspect[0]?.State;
                if (state?.Status === 'running') {
                    // Försök göra ett test-anrop till health endpoint
                    try {
                        console.log(`Testing health endpoint at http://localhost:${containerInfo.port}/health`);
                        const response = await axios.get(`http://localhost:${containerInfo.port}/health`, {
                            timeout: 5000 // 5 sekunders timeout
                        });
                        if (response.status === 200) {
                            console.log('Container is ready and responding to health checks');
                            return;
                        }
                    } catch (err) {
                        console.log(`Health check failed (attempt ${i + 1}):`, err.message);
                    }
                } else {
                    console.log(`Container status: ${state?.Status || 'unknown'}`);
                }
            } catch (err) {
                console.log(`Container check failed (attempt ${i + 1}):`, err.message);
            }

            // Vänta innan nästa försök
            console.log(`Waiting ${retryDelay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        throw new Error('Container failed to become ready in time');
    }

    async runContainer(containerInfo, input) {
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
            if (error.response) {
                console.error('Response error:', error.response.data);
            } else if (error.request) {
                console.error('No response received:', error.request);
            }
            throw new Error(`Failed to execute function: ${error.message}`);
        }
    }

    async removeContainer(functionId) {
        const containerInfo = await this.getContainer(functionId);
        if (!containerInfo) return;

        // Stoppa den körande containern
        if (containerInfo.containerId) {
            await new Promise((resolve) => {
                const stop = spawn('docker', ['stop', containerInfo.containerName]);
                stop.on('close', resolve);
            });
        }

        // Ta bort Docker-imagen
        await new Promise((resolve) => {
            const remove = spawn('docker', ['rmi', '-f', containerInfo.imageName]);
            remove.on('close', resolve);
        });

        // Ta bort temporär mapp
        try {
            await fs.rm(containerInfo.tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Failed to cleanup temporary directory:', error);
        }

        // Ta bort container-informationen
        await this.removeContainerInfo(functionId);
    }

    async execute(sourceCode, functionId, input) {
        let containerInfo = await this.getContainer(functionId);
        
        // Om containern inte finns eller har ändrad källkod, skapa en ny
        if (!containerInfo || containerInfo.sourceCode !== sourceCode) {
            // Om det finns en gammal container, ta bort den först
            if (containerInfo) {
                await this.removeContainer(functionId);
            }
            containerInfo = await this.createContainer(sourceCode, functionId);
            containerInfo.sourceCode = sourceCode; // Spara källkoden för framtida jämförelser
        }
        
        return await this.runContainer(containerInfo, input);
    }
}

module.exports = ContainerClient; 