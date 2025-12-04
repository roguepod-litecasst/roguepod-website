const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '../public/blog');
const outputFile = path.join(__dirname, '../public/blog-index.json');

// Get all .md files in the blog directory
const files = fs.readdirSync(blogDir)
  .filter(file => file.endsWith('.md') && file !== 'POST_TEMPLATE.md')
  .map(file => file.replace('.md', ''));

// Write the index file
fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));

console.log(`Generated blog index with ${files.length} posts:`, files);
