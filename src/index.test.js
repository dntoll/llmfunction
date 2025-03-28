const request = require('supertest');
const express = require('express');
const app = require('./index');

describe('POST /llmfunction/create', () => {
    test('skapar en funktion med giltig data', async () => {
        const requestData = {
            prompt: "Konvertera temperatur från Celsius till Fahrenheit",
            exampleInput: {
                celsius: 0
            },
            examples: [
                {
                    input: { celsius: 0 },
                    output: { fahrenheit: 32 }
                }
            ]
        };

        const response = await request(app)
            .post('/llmfunction/create')
            .send(requestData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('identifier');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toEqual(requestData);
        expect(typeof response.body.identifier).toBe('string');
        expect(response.body.identifier.length).toBe(64); // SHA-256 är 64 tecken i hex
    });

    test('returnerar 400 när obligatoriska fält saknas', async () => {
        const invalidData = {
            prompt: "Konvertera temperatur",
            // exampleInput saknas
            examples: []
        };

        const response = await request(app)
            .post('/llmfunction/create')
            .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Saknade obligatoriska fält');
    });

    test('genererar samma identifier för samma data', async () => {
        const requestData = {
            prompt: "Test prompt",
            exampleInput: { test: "data" },
            examples: [{ input: { test: "data" }, output: { result: "data" } }]
        };

        const response1 = await request(app)
            .post('/llmfunction/create')
            .send(requestData);

        const response2 = await request(app)
            .post('/llmfunction/create')
            .send(requestData);

        expect(response1.body.identifier).toBe(response2.body.identifier);
    });
}); 