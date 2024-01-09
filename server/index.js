import express from 'express'
import logger from 'morgan'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

const port = process.env.PORT ?? 3000

dotenv.config()
const app = express()
const server = createServer(app)
const io = new Server(server, {
  connectionStateRecovery: {}
})
app.use(express.static('client'))

const db = createClient({
  url: "libsql://stunning-gargoyles-ramroman163.turso.io",
  authToken: process.env.DB_TOKEN
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    user TEXT,
    date DATETIME
  )
`)

io.on('connection', async (socket) => {
  console.log('a user has connected!');

  socket.on('disconnect', () => {
    console.log('an user has disconnected!');
  })

  const formatHours = (date) => {
    let formatedDate = date.getHours() + ':'
    let minutes = date.getMinutes();
    minutes = minutes.length === 1 ? "0" + minutes : minutes
    formatedDate += minutes

    return formatedDate
  }

  socket.on('chat message', async (message) => {
    let result;
    const user = socket.handshake.auth.username ?? 'anonymous';
    const date = formatHours(new Date());
    try {
      result = await db.execute({
        sql: `INSERT INTO messages (content, user, date) VALUES (:content, :username, :date)`,
        args: { content: message, username: user, date }
      })
    } catch (e) {
      console.error(e)
      return;
    }
    io.emit('chat message', message, result.lastInsertRowid.toString(), user, date)

  })

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: 'SELECT id, content, user, date FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0]
      })

      results.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString(), row.user, row.date)
      })
    } catch (e) {
      console.error(e)
    }
  }
})

app.use(logger('dev'))

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
})