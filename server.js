const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const messages = [];
const users = {};

io.on("connection", (socket) => {
  console.log("Пользователь подключился:", socket.id);

  // Отправляем историю сообщений новому пользователю
  socket.emit("history", messages);

  // Пользователь входит с именем
  socket.on("join", (name) => {
    users[socket.id] = name;
    io.emit("userList", Object.values(users));
    io.emit("system", `${name} вошёл в чат`);
    console.log(`${name} вошёл`);
  });

  // Получаем и рассылаем сообщение
  socket.on("message", (text) => {
    const name = users[socket.id] || "Аноним";
    const msg = {
      id: Date.now(),
      name,
      text,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    };
    messages.push(msg);
    if (messages.length > 200) messages.shift(); // храним последние 200
    io.emit("message", msg);
  });

  // Пользователь печатает
  socket.on("typing", () => {
    const name = users[socket.id];
    if (name) socket.broadcast.emit("typing", name);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("stopTyping");
  });

  // Пользователь отключился
  socket.on("disconnect", () => {
    const name = users[socket.id];
    if (name) {
      delete users[socket.id];
      io.emit("userList", Object.values(users));
      io.emit("system", `${name} вышел из чата`);
    }
  });
});

app.get("/", (req, res) => res.send("Сервер мессенджера работает ✅"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
