'use strict'

const gm = require('gm')
.subClass({ imageMagick: true });
const request = require('request');
const lwip = require('lwip');
const co = require('co');
const moment = require('moment');
const AWS = require('aws-sdk');
AWS.config.update({
    region : 'ap-northeast-1',
    accessKeyId : 'AKIAJPBR5B5DNQLIV72A',
    secretAccessKey : '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',
})
const s3 = new AWS.S3();

const mapURL = "https://maps.googleapis.com/maps/api/staticmap?center=";
const format = "&zoom=8&scale=1&size=640x640&format=png";
const style = '&style=feature:administrative|element:labels.text|visibility:off&style=feature:administrative.locality|element:labels.text|visibility:off&style=feature:administrative.neighborhood|element:labels.text|visibility:off&style=feature:landscape.man_made|element:labels.text|visibility:off&style=feature:landscape.natural|element:geometry.fill|visibility:on|color:0xe0efef&style=feature:landscape.natural|element:labels.text|visibility:off&style=feature:poi|element:geometry.fill|visibility:on|hue:0x1900ff|color:0xc0e8e8&style=feature:poi|element:labels.text|visibility:off&style=feature:poi|element:labels.icon|visibility:off&style=feature:road|element:geometry|lightness:100|visibility:simplified&style=feature:road|element:labels|visibility:off&style=feature:transit|element:labels.text|visibility:off&style=feature:transit|element:labels.icon|visibility:off&style=feature:transit.line|element:geometry|visibility:on|lightness:700&style=feature:water|element:all|color:0x7dcdcd';
const fs = require('fs');


const event = {
  query:{
    diveLogId : '59771d46332d55701c9eaa15',
    type: 'og',
    env: 'development'
  }
}

exports.handler = function(event, context, callback) {
    const Canvas = require('canvas')
        , canvas = new Canvas(640, 640)
        , Font = Canvas.Font
        , Image = Canvas.Image
        , path = require('path')

    const sourceHanSans = new Font('sourceHanSans', fontFile('./SourceHanSans.otf'));

    function fontFile(name) {
      return path.join(__dirname, './', name);
    }

    function lwipOpenByBuffer(buffer, imageType) {
        return new Promise(function(resolve, reject){
            lwip.open(buffer, imageType, function(err, image){
                if(err) reject(err);
                else resolve(image);
            })
        })
    }

    function lwipOpenByPath(path) {
        return new Promise(function(resolve, reject){
            lwip.open(path, function(err, image){
                if(err) reject(err);
                else resolve(image);
            })
        })
    }

    function lwipCrop(image, width, height) {
        return new Promise(function(resolve, reject){
            image.crop(width, height, function(err, result){
                if(err) reject(err);
                else resolve(result);
            })
        })
    }

    function lwipPaste(baseImage, pasteImage, left, top) {
        return new Promise(function(resolve, reject){
            baseImage.paste(left, top, pasteImage, function(err, result){
                if(err) reject(err);
                else resolve(result);
            })
        })
    }

    function lwipToBuffer(image, imageType) {
        return new Promise(function(resolve, reject){
            image.toBuffer(imageType, function(err, result){
                if(err) reject(err);
                else resolve(result);
            })
        })
    }

    function resizeAndCropImage (buffer, imageType) {
        return new Promise(function(resolve, reject) {
            gm(buffer)
            .resize('640', '640', '^')
    		.gravity('Center')
    		.crop('640', '640')
    		.autoOrient()
    		.toBuffer(imageType, function(err, res) {
        		if (err) {
        		    reject(err);
        		} else {
                    resolve(res);
        		}
    		});
        })
    }

    function getImageType (s3Url) {
        let splitUrl = s3Url.split('/');
        let fileName = splitUrl[splitUrl.length-1];
        let imageType = fileName.split('.')[1];
        return imageType;
    }

    function getGoogleMapImage(lat, lng) {
        return new Promise(function(resolve, reject){
            let requestUrl = mapURL + lat + ',' + lng + format + style;
            request({url:requestUrl, encoding:null}, function(err, response, body){
                if(err) reject(err);
                else resolve(response.body);
            })
        })
    }

    function getDiveLogInfo(domain, diveLogId) {
        return new Promise(function(resolve, reject){
            let requestUrl = domain + 'discover/v0/post/diveLog/' + diveLogId;
            request({url: requestUrl, headers:{'accept-language':'en'}, encoding:null}, function(err, response, body){
                if(err)reject(err);
                else {
                    resolve(JSON.parse(response.body.toString()));
                }
            })
        })
    }

    function s3GetImageBuffer(url) {
        return new Promise(function(resolve, reject){
            request({url:url, encoding:null}, function(err, response, body){
                if(err) reject(err);
                else resolve(response.body);
            })
        })
    }

    function updateToS3(bucket, id, buffer, type) {
        return new Promise(function(resolve, reject){
            if(type !== 'og'){
                type = 'normal';
            }
            let url = 'https://s3-ap-northeast-1.amazonaws.com/' + bucket + '/' + type + '/' + id + '.jpg';
            let param = {
                Bucket: bucket,
                Key: type + '/' + id + '.jpg',
                Body: buffer,
                ACL: "public-read"
            }
            s3.putObject(param, function(err, data){
                if(err) reject(err);
                else resolve(url);
            })
        })
    }

    function updateShareurl(domain, diveLogId, url) {
        return new Promise(function(resolve, reject){
            url = url + "?t=" + Date.now();
            let param = {
                method: 'PATCH',
                url: domain + 'divelog/v0/' + diveLogId + '/sharePhoto',
                headers: {
                    'accept-language': 'en',
                    'content-type': 'text/cmd'
                },
                body: url
            }
            request(param, function(err, response, body){
                if(err) reject(err);
                else {
                    let result = JSON.parse(response.body.toString());
                    if(result.statusCode === 200){
                        resolve(result);
                    }else {
                        reject(result);
                    }
                }
            })
        })
    }

    function fillTextWithSpacing (ctx, text, x, y, spacing) {
        //Measure wAll, the width of the entire string using measureText()
        console.log(text);
        let wAll = ctx.measureText(text).width;

        do {
            //Remove the first character from the string
            let char = text.substr(0, 1);
            text = text.substr(1);

            //Print the first character at position (X, Y) using fillText()
            ctx.fillText(char, x, y);
            let wShorter;
            if (text == "")
            wShorter = 0;
            else
            wShorter = ctx.measureText(text).width;
            let wChar = wAll - wShorter;

            x += wChar + spacing;
            wAll = wShorter;
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
        let lineHeight = fontSize + 10;
        let spacing = 0.7 ;
        ctx.font = fontSize + 'px Arial Unicode MS';
        ctx.textBaseline="top";
        ctx.fillStyle = 'white';
        words.map(word => {
            let flag = isCh(word.slice(0,1));
            let testLine = flag ? line + word : line + word + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if(testWidth > maxWidth) {
                // fillTextWithSpacing(ctx, line, x, y, spacing);
                ctx.fillText(line, x, y);
                line = flag ? word : word + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        })
        // fillTextWithSpacing(ctx, line, x, y, spacing);
        ctx.fillText(line, x, y);
        return y + fontSize + 13;
    }

    function drawDepthAndDuration (ctx, text, x, y, fontSize) {
        ctx.font = fontSize + 'px Arial Unicode MS';
        ctx.textBaseline="top"
        ctx.textAlign="end";
        ctx.fillStyle = 'white'
        ctx.fillText(text, x, y);
    }

    function drawCurve(image, diveProfile, height, mindepth, maxdepth, profileHeight) {
        let interval = 640/diveProfile.length;
        image.stroke("white", 1)
        for (let i = 0 ; i < diveProfile.length; i++){
            let x0, y0, x1, y1;
            if(i === diveProfile.length-1){
                let p0 = (diveProfile[i].pressure-mindepth)/(maxdepth-mindepth);
                x0 = Math.ceil(i*interval);
                y0 = Math.ceil(profileHeight*p0)+height;
                x1 = Math.ceil(640);
                y1 = Math.ceil(height);
            }else {
                let p0 = (diveProfile[i].pressure-mindepth)/(maxdepth-mindepth);
                let p1 = (diveProfile[i+1].pressure-mindepth)/(maxdepth-mindepth);
                x0 = Math.ceil(i*interval);
                y0 = Math.ceil(profileHeight*p0)+height;
                x1 = Math.ceil((i+1)*interval);
                y1 = Math.ceil(profileHeight*p1)+height;
            }
            image.drawLine(x0,y0,x1,y1)
        }
        return image

    }

    function drawBlueArea(image, diveProfile, height, mindepth, maxdepth, profileHeight) {
        let totalx = 0, interval = 640/diveProfile.length;

        image.fill('#59C1E4')
        image.stroke("#59C1E4", 1.5)
        for(let i = 0; i < diveProfile.length; i++){
            let x0, y0, x1, y1;
            if(i === diveProfile.length-1){
                let p0 = (diveProfile[i].pressure-mindepth)/(maxdepth-mindepth);
                x0 = Math.ceil(i*interval);
                y0 = Math.ceil(profileHeight*p0)+height;
                x1 = Math.ceil(640);
                y1 = Math.ceil(height);
            }else {
                let p0 = (diveProfile[i].pressure-mindepth)/(maxdepth-mindepth);
                let p1 = (diveProfile[i+1].pressure-mindepth)/(maxdepth-mindepth);
                x0 = Math.ceil(i*interval);
                y0 = Math.ceil(profileHeight*p0)+height;
                x1 = Math.ceil((i+1)*interval);
                y1 = Math.ceil(profileHeight*p1)+height;
            }

            // console.log(totalx);
            for(let j = totalx; j < totalx + interval; j++){
                image.drawLine(j,(y0+((y1-y0)/interval)*(j-totalx)),j,height);

            }
            totalx = totalx + interval;
        }
        return image;

    }

    function writeCharacters(date, spot, site, maxDepth, duration, diveType) {

        let time = diveType === "Free" ? " secs" : " mins";
        let ctx = canvas.getContext("2d");
        let maxWidth = 460;
        let x = 20 , y = 40;
        y = textLindFeed(ctx, date+ '  |  ' + diveType, x, y, 20, maxWidth);
        y = textLindFeed(ctx, spot, x, y, 36, maxWidth);
        y = textLindFeed(ctx, site, x, y, 20, maxWidth);
        drawDepthAndDuration(ctx, 'Max  Depth', 24, 410, 20);
        drawDepthAndDuration(ctx, maxDepth + ' m', 32, 450, 30);
        drawDepthAndDuration(ctx, 'Duration', 182, 410, 20);
        drawDepthAndDuration(ctx, duration + time, 172, 450, 30);
        return canvas.toBuffer();

    }

    function writeCharactersForOg(date, spot, site, maxDepth, duration, diveType) {

        let time = diveType === "Free" ? " secs" : " mins";
        let ctx = canvas.getContext("2d");
        let maxWidth = 460;
        let x = 20 , y = 182;
        y = textLindFeed(ctx, date+ '  |  ' + diveType, x, y, 20, maxWidth);

        y = textLindFeed(ctx, spot, x, y, 36, maxWidth);
        y = textLindFeed(ctx, site, x, y, 20, maxWidth);
        drawDepthAndDuration(ctx, 'Max  Depth', 600, 182, 20);
        drawDepthAndDuration(ctx, maxDepth + ' m', 600, 212, 30);
        drawDepthAndDuration(ctx, 'Duration', 600, 252, 20);
        drawDepthAndDuration(ctx, duration + time, 600, 282, 30);
        return canvas.toBuffer();

    }

    function getMaxDepth (pressure, airPressure, waterType) {
        if(!pressure) {
            return -1;
        }
        const density = (waterType && waterType === 1) ? 1.025 : 1;
        if (airPressure && 400 < airPressure && airPressure < 1100) {
        }else {
            airPressure = 1000;
        }
        let depth = ((pressure - airPressure) / density / 100);
        depth = floorNumber(depth, 1);
        return depth;
    }

    function floorNumber (value, precision) {
        let multiplier = Math.pow(10, precision || 0);
        return Math.floor(value * multiplier) / multiplier;
    }

    function drawLogDiveInfo(diveProfile, date, spot, site, diveMaxDepth, diveDuration, type, diveType) {
        let mindepth = 3000 , maxdepth = 0;
        if(diveProfile.length >= 1){
            for(let i = 0; i < diveProfile.length; i++){
                if(mindepth > diveProfile[i].pressure){
                    mindepth = diveProfile[i].pressure;
                }
                if(maxdepth < diveProfile[i].pressure){
                    maxdepth = diveProfile[i].pressure;
                }
            }
        }
        let image;
        if(type === 'og') {
            let chabuffer = writeCharactersForOg(date, spot, site, diveMaxDepth, diveDuration, diveType);
            if (diveProfile.length < 1){
                return Promise.all([
                    lwipOpenByPath('./mask01-03.png'),
                    lwipOpenByBuffer(chabuffer, 'png')
                ])
                .then(res => lwipPaste(res[1], res[0], 0, 0))
                .then(image => lwipToBuffer(image, 'png'))
                .catch(err => console.log('!!',err))
            } else {
                image = gm(chabuffer, 'image.png');
                image = drawCurve(image, diveProfile, 377, mindepth, maxdepth, 85);
            }

        } else {
            let chabuffer = writeCharacters(date, spot, site, diveMaxDepth, diveDuration, diveType);
            image = gm(chabuffer, 'image.png');
            image = drawCurve(image, diveProfile, 500, mindepth, maxdepth, 100);
        }
        return new Promise((resolve, reject) => {
            image.toBuffer((err, buffer) => {
                if(err) return reject(err);
                else return resolve(buffer);
            })
        })

    }


    function mangeDiveLogImage(url, diveProfile, date, spot, site, diveMaxDepth, diveDuration, type, diveType) {
        return new Promise(function(resolve, reject){
            co(function*(){
                let imageType = getImageType(url);
                let buffer = yield s3GetImageBuffer(url);
                buffer = yield resizeAndCropImage(buffer, imageType);
                let image = yield lwipOpenByBuffer(buffer, 'jpg')
                let maskImage ;
                if(type === 'og') {
                    maskImage = yield lwipOpenByPath('./mask01-01.png')
                }else {
                    maskImage = yield lwipOpenByPath('./mask01-02.png')
                }

                if(image.width() < 640 || image.height() < 640) {
                    yield Promise.reject('insufficient 640');
                }
                image = yield lwipPaste(image, maskImage, 0, 0);

                buffer = yield drawLogDiveInfo(diveProfile, date, spot, site, diveMaxDepth, diveDuration, type, diveType)

                let logInfoImage = yield lwipOpenByBuffer(buffer, 'png');
                image = yield lwipPaste(image, logInfoImage, 0, 0)

                let resBuffer = yield lwipToBuffer(image, 'jpg');
                return resolve(resBuffer);
            }).catch(function(err){
                return reject(err);
            })
        })
    }

    function generateSpotMap(lat, lng, spot, site, date, diveMaxDepth, duration, diveProfile, type, diveType) {
        return new Promise(function(resolve, reject){
            co(function*(){
                let buffer = yield getGoogleMapImage(lat, lng);
                let openImg = yield [
                    lwipOpenByBuffer(buffer, 'png'),
                    lwipOpenByPath('./mask02-01.png'),
                    lwipOpenByPath('./mask02-02.png'),
                    lwipOpenByPath('./mask01-03.png')
                ]
                let image = openImg[0];
                let spotImage = openImg[1];
                let maskImage = openImg[2];
                let profileImage = openImg[3];
                image = yield lwipPaste(image, maskImage, 0, 0);
                image = yield lwipPaste(image, spotImage, 0, 0);

                buffer = yield drawLogDiveInfo(diveProfile, date, spot, site, diveMaxDepth, duration, type, diveType)
                let logInfoImage = yield lwipOpenByBuffer(buffer, 'png');
                image = yield lwipPaste(image, logInfoImage, 0, 0)

                let resBuffer = yield lwipToBuffer(image, 'jpg');
                return resolve(resBuffer);
            }).catch(function(err){
                return reject(err);
            })
        })
    }

    function pickSuccessImage (medias) {
        return new Promise(function(resolve, reject) {
            co(function*() {
                let count = 0 , successImage = '';
                while (count < medias.length) {
                    if(medias[count].status === "Active" && medias[count].privacy === "public") {
                        if(medias[count].type === "Photo" && medias[count].url.length > 0) {
                            let buffer = yield s3GetImageBuffer(medias[count].url);
                            let image = yield lwipOpenByBuffer(buffer, 'jpg')
                            if(image.width() >= 640 && image.height() >= 640) {
                                successImage = medias[count].url;
                                break;
                            }
                        } else if (medias[count].type === "Video" && medias[count].thumbnailUrl.length > 0){
                            let buffer = yield s3GetImageBuffer(medias[count].thumbnailUrl);
                            let image = yield lwipOpenByBuffer(buffer, 'jpg')
                            if(image.width() >= 640 && image.height() >= 640) {
                                successImage = medias[count].thumbnailUrl;
                                break;
                            }
                        }
                    }
                    count ++;
                }
                resolve (successImage);
            }).catch(function(err){
                reject(err);
            })
        })
    }


    co(function*(){
        let type = event.query.type;
        let diveLogId = event.query.diveLogId;
        let env = event.query.env;
        let domain = '', bucket = '';
        console.log(event);
        switch (env) {
            case 'development' :
            domain = 'http://dev.tritondive.co/apis/';
            bucket = 'deepblusharedev';
            break;
            case 'test' :
            domain = 'http://test.tritondive.co/apis/';
            bucket = 'deepblusharetest';
            break;
            case 'production' :
            domain = 'http://prod.tritondive.co/apis/';
            bucket = 'deepblushare';
            break;
            default :
            break;
        }
        let response = yield getDiveLogInfo(domain, diveLogId);
        let logDive = response.result;
        let spot = logDive.diveLog.divespot.divespot;
        let site = logDive.diveLog.divespot.divesite;
        let date = moment(logDive.diveLog.diveTime).format('MMM DD YYYY');
        let diveMaxDepth = getMaxDepth(logDive.diveLog.diveMaxDepth, logDive.diveLog.airPressure, logDive.diveLog.waterType);
        // let diveMaxDepth = (Math.round((logDive.diveLog.diveMaxDepth/100) * 10) /10).toFixed(1);

        let diveType = logDive.diveLog.diveType;
        let diveDuration = diveType === 'Free' ? logDive.diveLog.diveDuration :  Math.round(logDive.diveLog.diveDuration/60);
        let lat = logDive.diveLog._geoLocation.coordinates[1];
        let lng = logDive.diveLog._geoLocation.coordinates[0];
        let _profile = [];

        if(logDive.diveLog._diveProfile){
            _profile = logDive.diveLog._diveProfile;
        }

        date = date.replace(/ /gi, '  ');
        site = site.replace(/ /gi, '  ').replace('’',"'");
        spot = spot.replace(/ /gi, '  ').replace('’',"'");

        let imageUrl = yield pickSuccessImage(logDive.medias);

        if(imageUrl === ''){
            console.log('generate map start');
            let result = yield generateSpotMap(lat, lng, spot, site, date, diveMaxDepth, diveDuration, _profile, type, diveType);
            result = yield updateToS3(bucket, diveLogId, result, type);
            yield updateShareurl(domain, diveLogId, result);
            console.log(result);
            console.log('generate map end');
            context.succeed({location:result});
        }else {
            console.log('manage image start');
            let result = yield mangeDiveLogImage(imageUrl, _profile, date, spot, site, diveMaxDepth, diveDuration, type, diveType);
            result = yield updateToS3(bucket, diveLogId, result, type);
            yield updateShareurl(domain, diveLogId, result);
            console.log(result);
            console.log('manage image end');
            context.succeed({location:result});
        }

    }).catch(function(err){
        console.log(err);
        context.fail(err);
    })
}
