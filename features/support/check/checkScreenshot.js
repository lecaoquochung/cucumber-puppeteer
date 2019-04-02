const assert = require('assert').strict;
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

/**
 * Takes a screenshot of the browser's current viewport and compares it to a reference screenshot
 * (if it exists).  If the reference does not exist, the screenshot is saved as the reference
 * and the test is marked as failed.
 * @param {String} screenName The name of the screenshot to take
 * @param {String} rootDir The root directory to save screenshots in.  Defaults to './screenshots'.
 */
module.exports = async function(screenName, rootDir) {
  const screenshotDir = rootDir ? rootDir : './screenshots';
  const pathCompare = `${screenshotDir}/compare/${screenName}.png`;
  const pathDiff = `${screenshotDir}/diff/${screenName}.png`;
  const pathRef = `${screenshotDir}/ref/${screenName}.png`;

  await this.page.screenshot({path: pathCompare, fullPage : true});

  // If there's no reference screenshot, save the taken screenshot as the new reference
  if(!fs.existsSync(pathRef)){
    fs.copyFileSync(pathCompare, pathRef);
    assert(false, `Expected reference screenshot to exist`);

  // Compare the two screenshots
  } else {
    const imgCompare = await parseImage(pathCompare);
    const imgRef = await parseImage(pathRef);

    assert.strictEqual(imgCompare.width, imgRef.width, 'Expected screenshot widths to match.');
    assert.strictEqual(imgCompare.height, imgRef.height, 'Expected screenshot heights to match.');

    // Compare the images
    const imgDiff = await new PNG({width: imgCompare.width, height: imgCompare.height});
    const diffPixels = await pixelmatch(imgCompare.data, imgRef.data, imgDiff.data, imgCompare.width, imgCompare.height, {threshold: 0.1});
    
    // If they don't match, save the difference screenshot
    if(diffPixels > 0){
      await imgDiff.pack().pipe(fs.createWriteStream(pathDiff));
    }

    assert.strictEqual(diffPixels, 0, 'Expected screenshots to match.');
  } 
}

/**
 * Parses an image path to a PNG image object.
 * @param {String} filename Full path to the image to parse as a PNG
 */
async function parseImage(filename){
  return new Promise(resolve => {
    const img = fs
      .createReadStream(filename)
      .pipe(new PNG())
      .on('parsed', () => resolve(img))
  });
}
