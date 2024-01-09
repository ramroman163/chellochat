import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js'

const form = document.getElementById("form")
const input = document.getElementById("input")
const messages = document.getElementById("messages")

const getUsername = async () => {
  const username = localStorage.getItem('username');

  if (username) {
    console.log(`User existed ${username}`)
    return username
  }

  const res = await fetch('https://random-data-api.com/api/users/random_user')
  const { username: randomUsername } = await res.json()

  localStorage.setItem('username', randomUsername)
  return randomUsername
}

const socket = io({
  auth: {
    serverOffset: 0,
    username: await getUsername()
  }
})

socket.on('chat message', (message, serverOffset, username, date) => {
  const item = `<li>
        <p>${message}</p>
        <small>
        <i class='bx bxs-user' style='color:#ffffff'></i>
        ${username}, ${date}</small>
      </li>`

  messages.insertAdjacentHTML('beforeend', item)

  messages.scrollTop = messages.scrollHeight

  socket.auth.serverOffset = serverOffset
})

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (input.value) {
    socket.emit('chat message', input.value)
    input.value = ''
  }
})