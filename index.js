const fs = require('fs');

let number = 0;
let year = 2013;
let eof = false;

const reComment = /::!--.*?--!::/sg;


if (process.argv.length < 3) {
    console.log('must supply filename');
    process.exit(1);
}

const filename = process.argv[2];

function processStory(lines) {
    const content = [];
    const metadata = {
        year, number,
    };
    let mode = '';
    number++;

    lines.shift(); //discard the null string at the start of story data because it's a BS null string
    for (const line of lines){
        if (line.startsWith('::')){
            const colon = line.indexOf(':', 2);
            const key = line.substring(2,colon);
            const value = line.substring(colon+2); //grabs anything that is after the colon
            switch (key) {
                case 'Story':
                    metadata.story = value;
                    break;
                case 'Title':
                    metadata.title = value;
                    break;
                case 'Prompt':
                    metadata.prompt = [value];
                    mode = 'prompt';
                    break;
                case 'Content':
                    mode = 'content';
                    break;
                case 'EOS':
                    mode = '';
                    break;
                case 'EOY':
                    year++;
                    break;
                case 'EOF':
                    eof = true;
                    break;

            }
            continue;
        }
        switch (mode){
            case 'prompt':
                metadata.prompt.push(line);
                break;
            case 'content':
                content.push(line);
                break;
        }
    }
    console.log(metadata,content);
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

        processStory(lines);

        // break out of while loop if we are at EOF
        if (toIndex === -1) {
            break;
        }

        // start next iteration at end of current story
        fromIndex = toIndex;
    }


} catch (err) {
    console.error(err);
}