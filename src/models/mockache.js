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

    gpt3SingleMessage(prompt, input, exampleOutput) {
        this.#prompt = prompt;
        this.#exampleOutput = exampleOutput;
        return this.#gptSingleMessage("gpt-3.5-turbo", input)
    }

    gpt4SingleMessage(prompt, input, exampleOutput) {
        this.#prompt = prompt;
        this.#exampleOutput = exampleOutput;
        return this.#gptSingleMessage("gpt-4o-mini", input);
    }


    #gptSingleMessage(model, input) {
        if (input.length > 16000) {
            throw new Error("Too large content, content length: " + input.length)
        }

        const exampleOutputJSONSTring =  JSON.stringify(this.#exampleOutput, null, 2)
        const inputJSONString =  JSON.stringify(input, null, 2)

        const message = `
You are part of a program, try to solve the task specified in the Prompt as if you are a 
function that should create a JSON object that matches what is specified as exampleOutput. 
Do not discuss the prompt, just solve the task. Your response is only the JSON object.
Make sure to create a correct JSON object that matches what is specified as ExampleOutput. 
Commas after each value in the JSON object.

 * Prompt:
${this.#prompt}

 * Input:
${inputJSONString}

 * ExampleOutput:
${exampleOutputJSONSTring}`;

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

        console.log(message)
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