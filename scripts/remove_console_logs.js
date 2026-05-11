const fs = require('fs');

const args = process.argv.slice(2);

args.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove standalone console.log statements
    // This regex safely handles  calls, even multiline ones
    const regex = /console\.log\([^)]*\);?/g;
    
    if (regex.test(content)) {
      const newContent = content.replace(regex, '');
      fs.writeFileSync(file, newContent);
      
    }
  } catch (err) {
    console.error(`[Cleaner Error] Failed to process ${file}:`, err);
  }
});