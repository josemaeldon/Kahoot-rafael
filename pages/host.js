// Create WebSocket connection.
const socket = new WebSocket("ws://servidor-kahoot.cloudbr.app/ws");
// buttons
const createRmBtn = document.getElementById("createRmBtn");
// rm id
const display = document.getElementById("display");
// name display
const names = document.getElementById("names");
// tracks score of player
const scores = new Map();
//  Listen for messages
var receiveMessage = (e) => {
	console.log("Message from server: ", event.data);
	let data = JSON.parse(event.data);
	console.log(data);

	const displayQuestion = (q) => {
		const questionDisplay = document.getElementById("questionDisplay");
		const choices = document.getElementById("choices");
		
		questionDisplay.innerText = q.question;
		for (choice of q.choices) {
			const li = document.createElement("li");
			li.innerText = choice;
			choices.appendChild(li);
		}
	}

	const clearQuestion = () => {
		question.innerText = "";
		while (choices.firstChild) {
			choices.firstChild.remove();
		}
	}

	switch (data.type) {
		case "roomCreated":
			display.innerText = `Room ID: ${data.roomId}`;
			break;
		case "userJoined":
			// adds child to hashmap
			scores.set(data.username, 0);
			console.log(scores);
			// adds child html element
			let child = document.createElement("div");
			child.classList.add("small-12");
			child.classList.add("medium-4");
			child.classList.add("large-2");
			child.classList.add("nameDisplay");

			child.setAttribute("id", `name-${data.username}`);

			child.innerText = data.username;

			names.appendChild(child);
			break;
		case "userLeft":
			// removes score tracking
			scores.delete(data.username);
			console.log(scores);
			// removes html element
			let left = document.getElementById(`name-${data.username}`);
			left.remove();
			break;
		case "roundBegin":
			displayQuestion(data.question);

			let time = data.question.time;
			intervalId = setInterval(() => {
				time -= 1;
				timeLeft.innerText = `Remaining time: ${time}`;
			}, 1000)
			break;
	}
};

socket.addEventListener("message", receiveMessage);

var createRoom = (questions) => {
	let request = {
		type: "createRoom",
		questions: [
			{
				question: "Test",
				choices: ["1", "2", "3"],
				answer: 1,
				time: 30,
			},
		]
	};
	request = JSON.stringify(request);
	console.log("Creating room: ", request);
	socket.send(request);

	createRmBtn.remove();
}
