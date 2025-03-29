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


