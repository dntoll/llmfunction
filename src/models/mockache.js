const axios = require('axios');

class Mockache {
    #url
    #OPENAI_API_KEY
    #OPENAI_API_ORG
    #prompt
    #exampleOutput
    //answer ="";

    constructor(url, openai_key, openai_org) {
        if (url == undefined)
            throw new Error("Mockache needs a llm provider url");
        this.#url = url;
        this.#OPENAI_API_KEY = openai_key;
        this.#OPENAI_API_ORG = openai_org;
        this.functions = new Map();
    }

    init(prompt, exampleOutput) {
        this.#prompt = prompt;
        this.#exampleOutput = exampleOutput;
    }

    gpt3SingleMessage(input) {
        return this.#gptSingleMessage("gpt-3.5-turbo", input)
    }

    gpt4SingleMessage(prompt, input) {
        // Simulera enkel logik för tester
        if (prompt.includes('temperatur')) {
            const celsius = input.celsius;
            return { fahrenheit: (celsius * 9/5) + 32 };
        } else if (prompt.includes('Addera')) {
            return { sum: input.a + input.b };
        }
        return { result: "test" };
    }

    #singleMessage(model, input) {
        const message = `${this.#prompt}\n\nInput:\n${input}\n\Model:\n$${JSON.stringify(this.#exampleOutput, null, 2)}`;

        const messages = [
            {
                "role": "system",
                "content": message
            }
        ]

        const headers = {
            'Content-Type': 'application/json'
        };

        return this.#post(model, messages, headers)
    }

    #gptSingleMessage(model, input) {
        if (input.length > 16000) {
            throw new Error("To large content " + input.length)
        }
        const message = `${this.#prompt}\n\nInput:\n${input}\n\nModel:\n${JSON.stringify(this.#exampleOutput, null, 2)}`;

        const messages = [
            {
                "role": "system",
                "content": message
            }
        ]

        const headers = {
            'Content-Type': 'application/json',
            "Authorization": "Bearer " + this.#OPENAI_API_KEY,
            "OpenAI-Organization": this.#OPENAI_API_ORG
        };

        return this.#post(model, messages, headers)
    }

    async #post(model, messages, headers) {
        const query = {
            "model": model,
            "messages": messages
        }

        this.answer = "";

        const response = await axios.post(this.#url, query, {
            headers: headers,
            timeout: 600000
        });

        this.answer = response.data.choices[0].message.content
        
        return this.#extractJSON(this.answer);
    }

    #extractJSON(input) {
        try {
            const firstParse = JSON.parse(input)
            return firstParse
        } catch (e) {
            //we do the parsing stuff...
        }

        try {
            const secondParse = JSON.parse(input.substring("json\n".length, input.length)) //strip json {}
            return secondParse
        } catch (e) {
            //we do the parsing stuff...
        }

        let jsonStr = ""
        try {
            // Regular expression to identify JSON objects
            const regex = /{(?:[^{}]|(?:\r?\n|.)*?(?=\\{))*?}/gs;
            const jsonMatch = input.match(regex);
            if (!jsonMatch) throw new Error("Could not find json");  // Return null if no JSON object found

            // Parse each JSON object found and add to results array
            let results = [];
            jsonMatch.forEach(jsonStr => {
                jsonStr = jsonStr.replace(/\\n\s+/g, '\\n'); //replace linebreaks with \n inside json from gpt
                jsonStr = jsonStr.replace(/\"(?=[^:]*$)/g, '\\"'); //replace the " with \"
                const parsedJSON = JSON.parse(jsonStr);
                results.push(parsedJSON);
            });

            if (results.length === 1) return results[0]; // If only one JSON object, return it directly
            return results; // If multiple JSON objects, return them as an array

        } catch (error) {
            console.error('Failed to parse JSON:', input, "jsonStr", jsonStr);
            throw error
        }
    }
}

module.exports = Mockache;