const fs = require('fs');

// Menjalankan file .sql lewat mysql2 dengan dukungan directive DELIMITER
// (mysql2 tidak mengenal DELIMITER karena itu perintah client CLI, bukan server).
// Dipakai oleh script setup dan provisioning tenant baru.

function splitSqlStatements(sqlText) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  const lines = sqlText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    const delimiterMatch = trimmed.match(/^DELIMITER\s+(\S+)/i);
    if (delimiterMatch) {
      if (buffer.trim()) {
        statements.push(buffer.trim());
        buffer = '';
      }
      delimiter = delimiterMatch[1];
      continue;
    }

    buffer += line + '\n';

    const bufferTrimmed = buffer.trimEnd();
    if (bufferTrimmed.endsWith(delimiter)) {
      const statement = bufferTrimmed.slice(0, -delimiter.length).trim();
      if (statement) {
        statements.push(statement);
      }
      buffer = '';
    }
  }

  if (buffer.trim()) {
    statements.push(buffer.trim());
  }

  return statements.filter((stmt) => {
    const withoutComments = stmt
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n')
      .trim();
    return withoutComments.length > 0;
  });
}

async function applySqlFile(connection, filePath) {
  const sqlText = fs.readFileSync(filePath, 'utf8');
  const statements = splitSqlStatements(sqlText);
  for (const statement of statements) {
    await connection.query(statement);
  }
  return statements.length;
}

module.exports = { splitSqlStatements, applySqlFile };
