'use strict';
const fs = require('fs');

var Canvas = require('canvas')
, canvas = new Canvas(640, 640)
, Font = Canvas.Font
, Image = Canvas.Image
, path = require('path');

// Canvas.registerFontFace({
//     fontFamily: 'sourceHans',
//     src: './SourceHanSans.otf'
// })
// Canvas.registerFont('./SourceHanSans.otf',{family: 'sourceHans'});
// var gubblebum = new Font('gubblebum', fontFile('SourceHanSans.otf'));

function fontFile(name) {
  return path.join(__dirname, './', name);
}

function fillTextWithSpacing (ctx, text, x, y, spacing){
    //Start at position (X, Y).
    //Measure wAll, the width of the entire string using measureText()
    let wAll = ctx.measureText(text).width;

    do
    {
        //Remove the first character from the string
        let char = text.substr(0, 1);
        text = text.substr(1);

        //Print the first character at position (X, Y) using fillText()
        ctx.fillText(char, x, y);
        let wShorter;
        //Measure wShorter, the width of the resulting shorter string using measureText().
        if (text == "")
        wShorter = 0;
        else
        wShorter = ctx.measureText(text).width;

        //Subtract the width of the shorter string from the width of the entire string, giving the kerned width of the character, wChar = wAll - wShorter
        let wChar = wAll - wShorter;

        //Increment X by wChar + spacing
        x += wChar + spacing;

        //wAll = wShorter
        wAll = wShorter;

        //Repeat from step 3
    } while (text != "");
}


function isCh(char) {
    return new Buffer(char).length > 1;
}

function parseToken (text) {

    function token(string) {
        let str = string.trim();
        if (str === string) {
            if (str) {
                if (isCh(str[0])) {
                    return [str[0], str.slice(1)];
                } else {
                    let chars = str.split('');
                    let b = chars.reduce((pre, cur, index) => {
                        if((cur === ' ' || isCh(cur)) && pre === 0) {
                            pre += index;
                        }
                        return pre;
                    },0)
                    if (b === 0) {
                        return [str, str.slice(str.length)];
                    } else {
                        return [str.slice(0, b), str.slice(b)];
                    }
                }
            } else {
                return [null, null];
            }
        } else {
            return token(str);
        }
    }

    let result = [];
    while (text) {
        let tkn = token(text)[0];
        text = token(text)[1];
        result = result.concat(tkn);
    }
    return result;
}



function textLindFeed (ctx, text, x, y, fontSize, maxWidth) {
    let words = parseToken(text);
    let line = '';
    let lineHeight = fontSize + 10; // 如果有換行 此為換行高度
    ctx.font = (fontSize + 'px Arial Unicode MS')
    ctx.textBaseline="top"
    words.map(word => {
        let flag = isCh(word.slice(0,1));
        let testLine = flag ? line + word : line + word + ' ';
        // let testLine = line + word + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if(testWidth > maxWidth) {
            // y += metrics.emHeightDescent // 根據字體調整高度
            // fillTextWithSpacing(ctx, line, x, y, 0.5);
            ctx.fillText(line, x, y);
            line = flag ? word : word + ' ';
            // line = word + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    })
    ctx.fillText(line, x, y);
    // fillTextWithSpacing(ctx, line, x, y, 0.5);
    return y + fontSize + 5 ;
}

function drawDepthAndDuration (ctx, text, x, y, fontSize) {
    ctx.font = fontSize + 'px Arial Unicode MS';
    ctx.textBaseline="top"
    ctx.textAlign="end";
    ctx.fillText(text, x, y);
}


let ctx = canvas.getContext("2d");
let maxWidth = 460;
let x = 20 , y = 182;
y = textLindFeed(ctx, 'FEB 22, 2017  |  Scuba', x, y, 20, maxWidth);
y = textLindFeed(ctx, 'Hilutungan 中Island Marineadferfdve Sanctuary中', x, y, 40, maxWidth);

y = textLindFeed(ctx, 'Mactan Island', x, y, 20, maxWidth);


drawDepthAndDuration(ctx, 'Max  Depth', 600, 182);
drawDepthAndDuration(ctx, '23.8 m', 600, 222);
drawDepthAndDuration(ctx, 'Duration', 600, 262);
drawDepthAndDuration(ctx, '46 mins', 600, 302);

// let ctx = canvas.getContext('2d');

// textLindFeed(ctx, "zzzzzzzzz中文 zzzzzzzzz 日文 ZZZZZZZZZ いたい zzzzzzzzzzzzMar中  zzzzzzzSanctuary  wefwef fwef", 20, 222, 470);
// ctx.fillText('123', 20, 222);
// ctx.fillText('123', 20, 268);
// ctx.fillText('123', 20, 314);

let buffer = canvas.toBuffer();

canvas.toDataURL('image/png', function(err, png){
    let data = png.replace(/^data:image\/\w+;base64,/, "");
    let buf = new Buffer(data, 'base64');
    fs.writeFile('image.png', buf);

});
// console.log('<img src="' + canvas.toDataURL() + '" />');
