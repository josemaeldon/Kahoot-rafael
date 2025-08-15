// Create WebSocket connection.
const socket = new WebSocket("ws://servidor-kahoot.cloudbr.app/ws");
// buttons
const joinBtn = document.getElementById("joinBtn");
// code box
const codeBox = document.getElementById("code");
// rm id
const display = document.getElementById("display");
// username stuff
const input = document.getElementById("username");
//  Listen for messages
var receiveMessage = (e) => {
	console.log("Message from server: ", event.data);
};

socket.addEventListener("message", receiveMessage);

// checks for closing

var socketClosed = (e) => {
	display.innerText = "Connection closed.";
	console.log(e);
}

socket.addEventListener("close", socketClosed);

// Send messages
var sendMessage = (e) => {
  const message = document.getElementById("message").value;
  console.log("Sending: ", message);
  socket.send(message);
};

// sends value on click
var sendAnswer = (e) => {
	const answer = event.target.innerHTML;
	let msg = {
		type: "answer",
		choice: parseInt(answer) - 1,
	};
	msg = JSON.stringify(msg);
	socket.send(msg);
	console.log("Sending: ", msg);
}

var joinRoom = (e) => {
	let code = codeBox.value;
	code = parseInt(code);
	let msg = {
		type: "joinRoom",
		roomId: code,
		username: input.value,
	};
	msg = JSON.stringify(msg);

	console.log("Code: ", msg);
	socket.send(msg);

	display.innerText = `Username: ${input.value}`;

	input.remove();
	codeBox.remove();
	joinBtn.remove();
}

var choices = document.getElementsByClassName("choice");
console.log(choices);
Array.from(choices).forEach(
	(choice, index, array) => {
		choice.addEventListener("click", sendAnswer);
	}
);
