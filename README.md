# CMPM-118-LLM-Map-Trainer

This repo houses multiple projects used to create the [TinyTown QA dataset](https://huggingface.co/datasets/collectioncard/TinyTownQA) for {insert paper URL here}.


## TinyTown Generator
Tiny Town generator creates a set of tiny town maps along with their associated world facts database for use in dataset creation.
debug features are toggleable at the top of `frontend/src/Scenes/TinyTownScene.js`.

All generated maps are stored in `backend/mapOutput` in a folder with the current timestamp.

To run: 
1.  `cd tinyTownGenerator/backend`
2.  `npm install`
3.  `npm run tinytown_generator`

## QA Maker
Automatically generates a question and answer set for each map created by the TinyTown Generator. Questions are not guaranteed to be correct and should be reviewed by hand.

This uses structured outputs and is designed to be used with GPT 4o. You'll need to provide api keys in main.ts.

To run: 
1.  `cd qaMaker`
2. `npm install`
3. `npm run qa_maker`
