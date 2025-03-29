import * as fs from "node:fs";
import * as path from "node:path";
import { createObjectCsvWriter } from 'csv-writer';
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

//****SETTINGS ****////

// LLM api
const modelURL = "https://localhost:1234";
const apiKey = 'NOPE';
const modelName = "gpt-4o-mini";
const sysPrompt = "You are the worlds best multiple choice test creator. You are tasked with taking in data about a tile based" +
    "game world and creating multiple choice questions about it. The worlds coordinate system starts at 0,0 at the top left corner of the map and expands to 20,20 at the bottom right." +
    "Keep your questions grounded in the data that you are given and " +
    "make sure that the answers are not too obvious. If no choice is good then the answer returned should be \"Nothing\". Not all questions have answers. If a question does not have an answer, return \"Nothing\". Answer every question. The user will provide you with the data and you are to come back with the questions." +
    "Generate at least 20 questions for each data set. Questions should include the following topics: 1). Relative spacial relationships. " +
    "2). Absolute distances between objects. 3). Properties of objects (example: which house has one window) " +
    "4). How to identify objects on the map. but you are free to add new question types. " +
    "Be sure to indicate the correct answer letter in the response. Answer the question correctly";

// Dataset location
const workingDir = "data";

//****END SETTINGS****////

interface QuestionData {
    question: string;
    answer: string;
    distractors: string[];
}

const QuestionDataSchema = z.object({
    questions: z.array(
        z.object({
            question: z.string(),
            answer_text: z.string(),
            distractors_text: z.array(z.string()),
        })
    )
});

interface FileData {
    baseName: string;
    file_name?: string;
    file_description?: string;
    question_data?: QuestionData[];
}

// Create the OpenAI object
let llmClient = new OpenAI({
    apiKey: apiKey
});

// Load in the text files and their image names
const files = fs.readdirSync(workingDir);
const data: { [key: string]: { image?: string; text?: string } } = {};
console.log(data);

files.forEach(file => {
    const ext = path.extname(file);
    const base = path.basename(file, ext);

    if (!data[base]) {
        data[base] = {};
    }

    if (ext === '.png') {
        data[base].image = file;
    } else if (ext === '.txt') {
        const filePath = path.join(workingDir, file);
        data[base].text = fs.readFileSync(filePath, 'utf8');
    }
});

const dataArray: FileData[] = Object.keys(data).map(key => ({
    baseName: key,
    file_name: data[key].image,
    file_description: data[key].text
}));

// Now we add the questions and answers
dataArray.forEach((item) => {
    getQaData(item.file_description, item);
});

// Now we send the data to the LLM API
async function getQaData(mapData: string, file: FileData): Promise<QuestionData[]> {
    let QuestionData: QuestionData[] = [];

    // Get model completion
    const completion = await llmClient.beta.chat.completions.parse({
        model: modelName,
        messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: mapData },
        ],
        response_format: zodResponseFormat(QuestionDataSchema, "test"),
        store: false
    });

    let questions = completion.choices[0].message.parsed;

    questions.questions.forEach((item) => {
        let question = {
            question: item.question,
            answer: item.answer_text,
            distractors: item.distractors_text
        };
        console.log(question);
        QuestionData.push(question);
    });

    // Add the question data to the file object
    file.question_data = QuestionData;

    // Save the question data as a JSON file
    fs.writeFileSync(file.baseName + `.json`, JSON.stringify(file));

    // Save the question data as a CSV file
    const csvWriter = createObjectCsvWriter({
        path: file.baseName + `.csv`,
        header: [
            { id: 'question', title: 'Question' },
            { id: 'answer', title: 'Answer' },
            { id: 'distractors', title: 'Distractors' }
        ]
    });

    const csvData = QuestionData.map(q => ({
        question: q.question,
        answer: q.answer,
        distractors: q.distractors.join('; ')
    }));

    await csvWriter.writeRecords(csvData);
    console.log('CSV file written successfully');

    return QuestionData;
}