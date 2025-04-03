const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ContainerClient {
    constructor(dockerImage = 'node:18-slim') {
        this.dockerImage = dockerImage;
        this.containers = new Map(); // Håller koll på aktiva containrar
    }
    async getContainer(functionId) {
        return this.containers.get(functionId);
    }

    async createContainer(sourceCode, functionId) {
        // Kolla om containern redan finns
        if (this.containers.has(functionId)) {
            return this.containers.get(functionId);
        }

        // Skapa en temporär mapp för containern
        const tempDir = path.join(process.cwd(), 'temp', functionId);
        await fs.mkdir(tempDir, { recursive: true });

        // Skapa package.json
        const packageJson = {
            name: functionId,
            version: '1.0.0',
            dependencies: {}
        };
        await fs.writeFile(
            path.join(tempDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Skapa index.js med källkoden
        await fs.writeFile(
            path.join(tempDir, 'index.js'),
            sourceCode
        );

        // Skapa Dockerfile för långlivad container
        const dockerfile = `
FROM ${this.dockerImage}
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENTRYPOINT ["node", "index.js"]
`;
        await fs.writeFile(
            path.join(tempDir, 'Dockerfile'),
            dockerfile
        );

        // Bygg och spara container-information
        const containerInfo = {
            id: functionId,
            imageName: `function-${functionId}`,
            tempDir: tempDir
        };

        await this.buildImage(containerInfo);
        this.containers.set(functionId, containerInfo);
        
        return containerInfo;
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
                console.log('Build output:', data.toString());
            });

            build.stderr.on('data', (data) => {
                buildError += data.toString();
                console.error('Build error:', data.toString());
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

    async runContainer(containerInfo, input) {
        return new Promise((resolve, reject) => {
            console.log('Running container with input:', JSON.stringify(input));
            const run = spawn('docker', [
                'run',
                '--rm',
                '--tty',
                containerInfo.imageName,
                JSON.stringify(input)
            ]);

            let output = '';
            let error = '';

            run.stdout.on('data', (data) => {
                output += data.toString();
                console.log('Run output:', data.toString());
            });

            run.stderr.on('data', (data) => {
                error += data.toString();
                console.error('Run error:', data.toString());
            });

            run.on('close', (code) => {
                console.log('Container exited with code:', code);
                console.log('Container output:', output);
                console.log('Container error:', error);
                
                if (code !== 0) {
                    reject(new Error(`Container execution failed: ${error}`));
                    return;
                }

                try {
                    // Hitta den sista raden som innehåller "Stringified result:"
                    const lines = output.split('\n');
                    const resultLine = lines.find(line => line.includes('Stringified result:'));
                    if (!resultLine) {
                        throw new Error('No result found in output');
                    }
                    const jsonStr = resultLine.split('Stringified result:')[1].trim();
                    const result = JSON.parse(jsonStr);
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Failed to parse container output: ${output}`));
                }
            });
        });
    }

    async removeContainer(functionId) {
        const containerInfo = this.containers.get(functionId);
        if (!containerInfo) return;

        // Ta bort Docker-imagen
        await new Promise((resolve, reject) => {
            const remove = spawn('docker', ['rmi', '-f', containerInfo.imageName]);
            remove.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Failed to remove Docker image ${containerInfo.imageName}`);
                }
                resolve();
            });
        });

        // Ta bort temporär mapp
        try {
            await fs.rm(containerInfo.tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Failed to cleanup temporary directory:', error);
        }

        this.containers.delete(functionId);
    }

    // Metod för att köra en funktion, skapar container om den inte finns
    async execute(sourceCode, functionId, input) {
        const containerInfo = await this.createContainer(sourceCode, functionId);
        return await this.runContainer(containerInfo, input);
    }
}

module.exports = ContainerClient; 