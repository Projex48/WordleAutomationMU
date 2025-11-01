const express = require('express')
const webdriver = require('selenium-webdriver')
const { Builder, Browser, By, Key, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/chrome')
const app = express()
const port = 3000

/********************************************************************************************************/
// CONSTS

// BROWSER TO USE
let BROWSER = Browser.CHROME
// TIMEOUTS
const TIMEOUT = 1000

/********************************************************************************************************/
// GLOBALS

let guess = 1
let driver

/********************************************************************************************************/
// HELPERS

clickElement = async (driver, xpath) => {
  await driver.findElement(By.xpath(xpath)).click();
}

waitForElement = async (driver, xpath) => {
  await driver.wait(until.elementIsVisible(driver.findElement(By.xpath(xpath))))
}

/********************************************************************************************************/
// ENDPOINTS

/*
 * Word Guessing Endpoint
 * Route: /guess/
 * Params: word The word you wish to guess
 */
app.post('/guess/:word', async (req, res) => {
  const { word } = req.params;

  if (word.length != 5) {
    console.log("Supplied word is not 5 letters!", word)
    return res.status(400).send("Incorrect word size", word);
  }

  // Out of guesses
  if (guess == 6) {
    return res.status(400).send("You've run out of guesses!");
  }

  try {
    if (!driver) driver = new webdriver.Builder().forBrowser(BROWSER).build()
    
    // Check if page open
    let title = await driver.getTitle()
    if (title != 'Wordle — The New York Times') {
      // Open browser to standard wordle page
      await driver.manage().setTimeouts({ implicit: TIMEOUT });
      await driver.get('https://www.nytimes.com/games/wordle/index.html')
      await driver.wait(until.titleIs('Wordle — The New York Times'))
      await waitForElement(driver, '//button[@data-testid="Play"]');
      await clickElement(driver, '//button[@data-testid="Play"]')
      await waitForElement(driver, '//button[@aria-label="Close"]')
      await clickElement(driver, '//button[@aria-label="Close"]');
    }

    // Wait for keyboard and 'type'
    await waitForElement(driver, '//button[@data-key="q"]')
    for (const ch of word) {
      await clickElement(driver, `//button[@data-key="${ch}"]`);
    }
    await clickElement(driver, `//button[@data-key="↵"]`);

    // Get result of entry
    let result = [];
    for (let i = 1; i < 6; ++i) {
      let state = await driver.findElement(By.xpath(`//div[@aria-label='Row ${guess}']//div[${i}]//div`)).getAttribute("data-state")
      if (state == "tbd") {
        await driver.sleep(TIMEOUT);
        --i;
        continue;
      }
      switch (state) {
        case 'correct':
          result.push(2)
          break;
        case 'present':
          result.push(1)
          break;
        default:
          result.push(0)
      }
    }
    ++guess;
    return res.status(200).send(result);
  } catch (err) {
    console.log(err.message);
  }
})

/********************************************************************************************************/

app.listen(port, () => {
  console.log(`Server up at http://127.0.0.1:${port}`)
})