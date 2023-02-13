//This module has to substitute the SillyClient module we were given


class MyClient 
{
    socket = null
    is_connected = null
    room = { name:"", clients:{} }
    clients = {}
    num_clients = 0

    user_id = 0
    user_name = "Default"

    on_connect = null; //when connected
	on_ready = null; //when we have an ID from the server
	on_message = null; //when somebody sends a message
	on_close = null; //when the server closes
	on_user_connected = null; //new user connected
	on_user_disconnected = null; //user leaves
	on_error = null; //when cannot connect
	on_world_info = null; //when a user moves

    connect(room_name, user_name, password) {

        room_name = room_name || ""
        user_name = user_name || "Default"
        this.user_name = user_name

        if (this.socket){
            this.socket.close()
        }

        let url = `ws://localhost:9016/${room_name}?username=${user_name}&password=${password}`
        this.socket = new WebSocket(url)

        this.socket.onopen = () => {

            this.clients = {}
            if(!this.room ){
                this.room = {name: "", clients: []}
            }
            this.is_connected = true

            this.room.name = room_name

        }

        let that = this
        this.socket.onclose = function () {

            if(that.socket != this){
                return
            }

            this.is_connected = false 
            this.socket = null
            this.room = null
        }

        this.socket.onmessage = (msg) => {
            this.manageServerMessage(msg)
        }

    }

    manageServerMessage( message ) {
        message = JSON.parse(message.data)
        switch (message.type) {
            case "REGISTER":

                console.log(message);
                //Close the register connection and go back to the LOGIN screen
                this.socket.close()
                if(message.exists){
                    alert("Account already exists")
                }
                let connecting = document.querySelector(".connecting")
                let register = document.querySelector(".register")

                connecting.style.display = "flex"
                register.style.display = "none"
                break;

            case "ID":
                this.user_id = message.userID
                this.clients[this.user_id] = {id: this.user_id, name: this.user_name}

                if(this.on_ready){
                    this.on_ready(this.user_id, this.user_name)
                }
                break;
        
            case "LOGIN":
                
                if(!this.clients[ message.userID ]) {
                    this.clients[ message.userID ] = { id: message.userID, name: message.user_name };
                    this.room.clients[ message.userID ] = { id: message.userID, name: this.user_name }
                    this.num_clients += 1;
                    console.log("Clients are " + this.room.clients + " and in total there are " + this.num_clients + " clients");
                }
                
                if(message.userID != this.user_id){
                    if (this.on_user_connected) {
                        this.on_user_connected(message.userID, message.username)
                    }
                    if(this.on_world_info) {
                        this.on_world_info(JSON.stringify(message))
                    }
                }

                break;

            case "LOGINERROR":

                alert("Username or password is incorrect")

                this.socket.close()
                break;

            case "LOGOUT":
                delete this.clients[ message.userID ];
                delete this.room.clients[ message.userID ];
                this.num_clients -= 1;
                console.log("Clients are " + this.room.clients + " and in total there are " + this.num_clients + " clients");
                if (this.on_user_disconnected) {
                    this.on_user_disconnected(message.userID, message.username)
                }
                if(this.on_world_info) {
                    this.on_world_info(JSON.stringify(message))
                }
                
                break;

            case "ROOM":
                this.clients = message.clients
                this.num_clients == message.length
                
                //Display the canvas
                let conScreen = document.querySelector(".mychat .connecting");
                let msgScreen = document.querySelector(".mychat .logged-in");
          
                conScreen.style.display = "none";
                msgScreen.style.display = "grid";

                if (this.on_connect){
                    this.on_connect()
                }
                break;

            case "MOVE": 
                if(message.userID != this.user_id){
                    if(this.on_world_info){
                        this.on_world_info(JSON.stringify(message))
                    }
                }
                break;
            case "WORLD":
                console.log("Received the message " + JSON.stringify(message));
                if(message.userID != this.user_id){
                    if(this.on_world_info){
                        this.on_world_info(JSON.stringify(message))
                    }
                }
                break;

            default:

                if(message.userID != this.user_id){
                    if(this.on_message){
                        this.on_message(message.userID, JSON.stringify(message))
                    }
                }
                break;

        }
    }

    //Sends a JSON message to everyone or just the specified targets
    sendMessage(message, targets){
        if (!message){
            console.error("Message not defined");
            return
        }

        if(targets){
            //If we have targets we want to add them to the message
            message["targets"] = targets
        }
        this.socket.send(JSON.stringify(message))
    }

    //Connect to register url
    register(username, password) {
        //TODO: add password to url
        let url = `ws://localhost:9016/register?username=${username}&password=${password}`
     
        this.socket = new WebSocket(url)
        this.socket.onmessage = (msg) => {
            this.manageServerMessage(msg)
        }
    }

}