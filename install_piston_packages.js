async function installPackage(language, version) {
  console.log(`Installing ${language} ${version}... This might take a minute.`);
  const response = await fetch('http://localhost:2000/api/v2/packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, version })
  });
  const data = await response.json();
  console.log(`Result for ${language}:`, data);
}

async function main() {
  await installPackage('java', '15.0.2');
  await installPackage('gcc', '10.2.0');
  console.log('Installation complete. Please try running your Java code again!');
}

main();
