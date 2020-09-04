/**
 * Custom blocks
 */
//% color=#0fbc11 icon="\uf1eb"
namespace ESP8266_IoT {

    let wifi_connected: boolean = false
    let thingspeak_connected: boolean = false
    let kitsiot_connected: boolean = false
    let last_upload_successful: boolean = false
    let userToken_def: string = ""
    let topic_def: string = ""
    let recevice_kidiot_text = ""
    const EVENT_ON_ID = 100
    const EVENT_ON_Value = 200
    const EVENT_OFF_ID = 110
    const EVENT_OFF_Value = 210
    let toSendStr = ""

    export enum State {
        //% block="Success"
        Success,
        //% block="Fail"
        Fail
    }

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 0) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("WIFI GOT IP")) {
                result = true
                break
            }
            else if (input.runningTime() - time > 5000) {
                break
            }
        }
        return result
    }
    /**
    * Initialize ESP8266 module 
    */
    //% block="set ESP8266|RX %tx|TX %rx|Baud rate %baudrate"
    //% tx.defl=SerialPin.P8
    //% rx.defl=SerialPin.P12
    //% ssid.defl=your_ssid
    //% pw.defl=your_password weight=100
    export function initWIFI(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        basic.pause(1000)
    }
    /**
    * connect to Wifi router
    */
    //% block="connect Wifi SSID = %ssid|KEY = %pw"
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw weight=95
    export function connectWifi(ssid: string, pw: string) {
        wifi_connected = false
        thingspeak_connected = false
        kitsiot_connected = false
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        basic.pause(3000)
    }
    /**
    * Connect to ThingSpeak
    */
    //% block="connect thingspeak"
    //% write_api_key.defl=your_write_api_key
    //% subcategory="ThingSpeak" weight=90
    export function connectThingSpeak() {
        if (wifi_connected && kitsiot_connected == false) {
            thingspeak_connected = false
            let text = "AT+CIPSTART=\"TCP\",\"api.thingspeak.com\",80"
            sendAT(text, 0) // connect to website server
            thingspeak_connected = waitResponse()
            basic.pause(100)
        }
    }
    /**
    * Connect to ThingSpeak and set data. 
    */
    //% block="set data to send ThingSpeak | Write API key = %write_api_key|Field 1 = %n1||Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% write_api_key.defl=your_write_api_key
    //% expandableArgumentMode="enabled"
    //% subcategory="ThingSpeak" weight=85
    export function setData(write_api_key: string, n1: number = 0, n2: number = 0, n3: number = 0, n4: number = 0, n5: number = 0, n6: number = 0, n7: number = 0, n8: number = 0) {
            toSendStr = "GET /update?api_key="
                + write_api_key
                + "&field1="
                + n1
                + "&field2="
                + n2
                + "&field3="
                + n3
                + "&field4="
                + n4
                + "&field5="
                + n5
                + "&field6="
                + n6
                + "&field7="
                + n7
                + "&field8="
                + n8
    }
    /**
    * upload data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
    */
    //% block="Upload data to ThingSpeak"
    //% subcategory="ThingSpeak" weight=80
    export function uploadData() {
        if (thingspeak_connected) {
            last_upload_successful = false
            sendAT("AT+CIPSEND=" + (toSendStr.length + 2), 100)
            sendAT(toSendStr, 100) // upload data
            last_upload_successful = waitResponse()
            basic.pause(100)
        }
    }

    /**
    * Wait between uploads
    */
    //% block="Wait %delay ms"
    //% delay.min=0 delay.defl=5000 weight=75
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Wifi connected %State" weight=70
    export function wifiState(state: boolean) {
        if (wifi_connected == state) {
            return true
        }
        else {
            return false
        }
    }

    /**
    * Check if ESP8266 successfully connected to ThingSpeak
    */
    //% block="ThingSpeak connected %State"
    //% subcategory="ThingSpeak" weight=65
    export function thingSpeakState(state: boolean) {
        if (thingspeak_connected == state) {
            return true
        }
        else {
            return false
        }
    }


    /**
    * Check if ESP8266 successfully uploaded data to ThingSpeak
    */
    //% block="ThingSpeak Last data upload %State"
    //% subcategory="ThingSpeak" weight=60
    export function tsLastUploadState(state: boolean) {
        if (last_upload_successful == state) {
            return true
        }
        else {
            return false
        }
    }
    /*-----------------------------------kitsiot---------------------------------*/
    function waitconnectKidsiot(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("CONNECTED") || serial_str.includes("ALREADY CONNECTED")|| serial_str.includes("SEND OK")) {
                result = true
                kitsiot_connected = true
                break
            }
            else if (input.runningTime() - time > 8000) {
                break
            }
        }
        return result
    }
    /**
    * Connect to kitsiot
    */
    //% subcategory=KidsIot weight=55
    //% blockId=initkitiot block="Connect KidsIot with userToken: %userToken Topic: %topic"
    export function connectKidsiot(userToken: string, topic: string): void {
        if (wifi_connected && thingspeak_connected == false) {
            userToken_def = userToken
            topic_def = topic
            sendAT("AT+CIPSTART=\"TCP\",\"139.159.161.57\",5555", 5000) // connect to website server
            let text_one = "{\"topic\":\"" + topic + "\",\"userToken\":\"" + userToken + "\",\"op\":\"init\"}"
            sendAT("AT+CIPSEND=" + (text_one.length + 2),500)
            sendAT(text_one, 1000)
            kitsiot_connected=true
        }
    }
    /**
    * upload data to kitsiot
    */
    //% subcategory=KidsIot weight=50
    //% blockId=uploadkitsiot block="Upload data %data to kidsiot"
    export function uploadKidsiot(data: number): void {
        if (kitsiot_connected) {
            data = Math.floor(data)
            let text_one = "{\"topic\":\"" + topic_def + "\",\"userToken\":\"" + userToken_def + "\",\"op\":\"up\",\"data\":\"" + data + "\"}"
            sendAT("AT+CIPSEND=" + (text_one.length + 2),500)
            sendAT(text_one, 1000)
        }
    }
    /**
    * disconnect from kitsiot
    */
    //% subcategory=KidsIot weight=45
    //% blockId=Disconnect block="Disconnect with kidsiot"
    export function disconnectKidsiot(): void {
        if (kitsiot_connected) {
            let text_one = "{\"topic\":\"" + topic_def + "\",\"userToken\":\"" + userToken_def + "\",\"op\":\"close\"}"
            sendAT("AT+CIPSEND=" + (text_one.length + 2),100)
            sendAT(text_one, 0)
            kitsiot_connected = false
        }
    }
    /**
    * Check if ESP8266 successfully connected to KidsIot
    */
    //% block="KidsIot connection %State"
    //% subcategory="KidsIot" weight=40
    export function kidsiotState(state: boolean) {
        if (kitsiot_connected == state) {
            return true
        }
        else {
            return false
        }
    }
    /**
* recevice value from kidsiot
*/
    //% block="When switch on"
    //% subcategory=KidsIot weight=35
    export function iotswitchon(handler: () => void) {
        recevice_kitiot()
        control.onEvent(EVENT_ON_ID, EVENT_ON_Value, handler)
    }
    /**
     * recevice value from kidsiot
     */
    //% block="When switch off"
    //% subcategory=KidsIot weight=30
    export function iotswitchoff(handler: () => void) {
        recevice_kitiot()
        control.onEvent(EVENT_OFF_ID, EVENT_OFF_Value, handler)
    }

    export function recevice_kitiot() {
        control.inBackground(function () {
            while (kidsiotState) {
                recevice_kidiot_text = serial.readLine()
                recevice_kidiot_text += serial.readString()
                if (recevice_kidiot_text.includes("CLOSED")) {
                    recevice_kidiot_text = ""
                    kitsiot_connected = false
                }
                if (recevice_kidiot_text.includes("switchon")) {
                    recevice_kidiot_text = ""
                    control.raiseEvent(EVENT_ON_ID, EVENT_ON_Value, EventCreationMode.CreateAndFire)
                }
                if (recevice_kidiot_text.includes("switchof")) {
                    recevice_kidiot_text = ""
                    control.raiseEvent(EVENT_OFF_ID, EVENT_OFF_Value, EventCreationMode.CreateAndFire)
                }
                basic.pause(20)
            }
        })
    }
}