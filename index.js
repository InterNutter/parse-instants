const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('story.db'); // these all call the libraries that do the thing

db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS stories (number INTEGER, year INTEGER, day INTEGER,title TEXT,prompt TEXT,content TEXT)");
    //making the table of story data
    db.run("CREATE TABLE IF NOT EXISTS tags (tag TEXT, number INTEGER)"); //making the table for tags. We will be messing with this later
});


let number = 1; //story number
let year = 2013; // I started writing instants in 2013
let eof = false; // not the end of file yet
let yearNumber = 1; // number of stories in a year

const yearCount = {}; // yearCount is an object
const reComment = /::!--.*?--!::/sg;
// finds the comments. Looks for "::!--" "." is any character after. "*" is a lot of characters. "?" is "look for the next instance of..."
// and then seek "--!::" s is "include the newlines" g is "global" - for the whole document.


if (process.argv.length < 3) {
    console.log('must supply filename'); // error check
    process.exit(1);
}

const filename = process.argv[2]; //file name is the third thing in the project call command

function processStory(lines) {
    const metadata = {
        year, number, day: yearNumber, //setting up some of the metadata we're storing in a file
    };
    let mode = '';
    number++; // increment story count
    yearNumber++; // increment the number of days in the year
    if (!yearCount[year]) yearCount[year]=0; //if it's not an empty set, then set it to zero
    yearCount[year]++; //increment yearCount

    lines.shift(); //discard the null string at the start of story data because it's a BS null string
    for (const line of lines){
        if (line.startsWith('::')){ // look for the metadata
            const colon = line.indexOf(':', 2); // get the string that identifies the metadata
            const key = line.substring(2,colon);
            const value = line.substring(colon+2); //grabs anything that is after the colon
            switch (key) { // action depending on metadata
                case 'Story':
                    metadata.story = value; //get story number
                    break;
                case 'Title':
                    metadata.title = value.replace(/^Challenge #\d+-\w+: /,''); // make sure the title data is clean of my absent-mindedness
                    break;
                case 'Prompt':
                    metadata.prompt = [value]; // get the prompt string
                    mode = 'prompt';
                    break;
                case 'Content':
                    metadata.content = []; // get the story strings
                    mode = 'content';
                    break;
                case 'EOS':
                    mode = ''; // find the end of the story
                    break;
                case 'EOY': // at the closing of the year
                    year++; // increase the year number
                    yearNumber = 1; // reset the days in the year
                    break;
                case 'EOF': // at the end of the file
                    eof = true; //we found the end!
                    break; // take a breather

            }
            continue;
        }
        switch (mode){ // now we got stuff to do with the data
            case 'prompt':
                metadata.prompt.push(line); // add in the prompt
                break;
            case 'content':
                metadata.content.push(line); // add in the content
                break;
        }
    }
    if (!metadata.title || !metadata.prompt || !metadata.content){
        console.log(metadata); // source file error checking
    }
    return metadata; // pass on all that juicy data
}

const stmt = db.prepare("INSERT INTO stories (number, year, day, title, prompt, content) VALUES (?, ?, ?, ?, ?, ?)"); // database building? Structure of the entries

function addStory(metadata) {
    db.serialize(function(){
        stmt.run(metadata.number, metadata.year, metadata.day, metadata.title, metadata.prompt.join('\n'), metadata.content.join('\n') );
        // putting all the gathered metadata into the stories database
    });
}

try {
    // read contents of the file
    let data = fs.readFileSync(filename, 'UTF-8');

    // Scrub comments

    data = data.replaceAll(reComment,'');

    // parse the content of the master file
    // `\n::Story: ` start of story and enumerator
    // look for next story start OR `\n::EOF::`

    let fromIndex = data.indexOf('\n::Story: '); //get the location of the Story marker

    while (true) {
        let toIndex = data.indexOf('\n::Story: ', fromIndex + 1); // get the location of the story end

        let story = data.substring(fromIndex, toIndex === -1 ? data.length : toIndex); //turn that into a string with EOF protection

        let lines = story.split('\n'); // turn that into an array of substrings

        // Processing the story goes here

        const metadata = processStory(lines);
        addStory(metadata);

        // break out of while loop if we are at EOF
        if (toIndex === -1) {
            break;
        }

        // start next iteration at end of current story
        fromIndex = toIndex;
    }

    console.log(yearCount);

} catch (err) {
    console.error(err);
}

stmt.finalize();
