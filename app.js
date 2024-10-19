require("dotenv").config();
const express = require("express");
const socketIo = require("socket.io");
const http = require("http");
const path = require("path");

const indexRouter = require("./routes/index-route");
const chatRouter = require("./routes/chat-route");

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));


const server = http.createServer(app);
const io = socketIo(server);

let waitingUsers = [];
let rooms = {};

io.on("connection", function (socket) {

    socket.on("joinRoom", function () {
        if (waitingUsers.length > 0) {

            let partner = waitingUsers.shift();
            const roomName = `${socket.id}-${partner.id}`;

            socket.join(roomName);
            partner.join(roomName);

            io.to(roomName).emit("joined", roomName);
        }
        else {
            waitingUsers.push(socket);
            console.log("waitting for a user to join....");
        }
    })

    socket.on("message", function (data) {
        socket.broadcast.to(data.room).emit("message", data.message);
    })

    socket.on("signalingMessage", function (data) {
        socket.broadcast.to(data.room).emit("signalingMessage", data.message);
    })

    socket.on("startVideoCall", function ({ room }) {
        socket.broadcast.to(room).emit("incomingCall");
    })

    socket.on("acceptCall", function ({ room }) {
        socket.broadcast.to(room).emit("callAccepted");
    })

    socket.on("rejectCall", function ({ room }) {
        socket.broadcast.to(room).emit("rejectedCall");
    })


    socket.on("disconnect", function () {

        let index = waitingUsers.findIndex((waitingUser) => waitingUser.id === socket.id);

        waitingUsers.splice(index, 1);

        console.log("User disconnected....");

    })

})



app.use("/", indexRouter);
app.use("/chat", chatRouter);


server.listen(process.env.PORT_NUMBER || "4000");