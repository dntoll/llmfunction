const APIController = require('../controllers/APIController');

// Skapa en mock-version av Mockache
const mockMockache = {
    gpt4SingleMessage: (prompt, input) => {
        // Simulera enkel logik för tester
        if (prompt.includes('temperatur')) {
            const celsius = input.celsius;
            return { fahrenheit: (celsius * 9/5) + 32 };
        } else if (prompt.includes('längd')) {
            const meters = input.meters;
            return { feet: meters * 3.28084 };
        }
        return { result: "test" };
    }
};

describe('APIController', () => {
    let controller;
    let testIdentifier1;
    let testIdentifier2;

    beforeAll(async () => {
        controller = new APIController(mockMockache);
        await controller.initialize();
    });

    describe('Skapa och verifiera funktioner', () => {
        test('skapar två olika funktioner', async () => {
            // Skapa första funktionen
            const result1 = await controller.createFunction({
                prompt: "Konvertera temperatur från Celsius till Fahrenheit",
                exampleInput: { celsius: 0 },
                examples: [
                    { input: { celsius: 0 }, output: { fahrenheit: 32 } },
                    { input: { celsius: 100 }, output: { fahrenheit: 212 } }
                ]
            });
            expect(result1).toHaveProperty('identifier');
            expect(result1).toHaveProperty('data');
            testIdentifier1 = result1.identifier;

            // Skapa andra funktionen
            const result2 = await controller.createFunction({
                prompt: "Konvertera längd från meter till fot",
                exampleInput: { meters: 1 },
                examples: [
                    { input: { meters: 1 }, output: { feet: 3.28084 } },
                    { input: { meters: 2 }, output: { feet: 6.56168 } }
                ]
            });
            expect(result2).toHaveProperty('identifier');
            expect(result2).toHaveProperty('data');
            testIdentifier2 = result2.identifier;
        });

        test('hämtar de skapade funktionerna', async () => {
            // Hämta första funktionen
            const data1 = await controller.getFunction(testIdentifier1);
            expect(data1.prompt).toBe("Konvertera temperatur från Celsius till Fahrenheit");

            // Hämta andra funktionen
            const data2 = await controller.getFunction(testIdentifier2);
            expect(data2.prompt).toBe("Konvertera längd från meter till fot");
        });

        test('listar alla funktioner', async () => {
            const functions = await controller.listFunctions();
            expect(functions).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ identifier: testIdentifier1 }),
                    expect.objectContaining({ identifier: testIdentifier2 })
                ])
            );
        });
    });

    describe('Kör funktioner', () => {
        test('kör temperaturkonvertering', async () => {
            const result = await controller.runFunction(testIdentifier1, { celsius: 25 });
            expect(result).toEqual({ fahrenheit: 77 });
        });

        test('kör längdkonvertering', async () => {
            const result = await controller.runFunction(testIdentifier2, { meters: 5 });
            expect(result).toEqual({ feet: 16.4042 });
        });
    });

    describe('Ta bort funktioner', () => {
        test('tar bort funktionerna', async () => {
            // Ta bort första funktionen
            await controller.removeFunction(testIdentifier1);

            // Ta bort andra funktionen
            await controller.removeFunction(testIdentifier2);
        });

        test('verifierar att funktionerna är borta', async () => {
            // Kontrollera att get kastar fel
            await expect(controller.getFunction(testIdentifier1))
                .rejects.toThrow('Funktion hittades inte med den angivna identifiern.');
            await expect(controller.getFunction(testIdentifier2))
                .rejects.toThrow('Funktion hittades inte med den angivna identifiern.');

            // Kontrollera att run kastar fel
            await expect(controller.runFunction(testIdentifier1, { celsius: 25 }))
                .rejects.toThrow('Funktion hittades inte med den angivna identifiern.');
            await expect(controller.runFunction(testIdentifier2, { meters: 5 }))
                .rejects.toThrow('Funktion hittades inte med den angivna identifiern.');
        });
    });
}); 