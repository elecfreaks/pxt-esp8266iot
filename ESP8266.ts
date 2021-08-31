//% color=#0fbc11 icon="\uf1eb"
namespace ESP8266_IoT {
    let CMD = 0
    let wifi_connected: boolean = false
    let thingspeak_connected: boolean = false
    let kidsiot_connected: boolean = false

    let userToken_def: string = ""
    let topic_def: string = ""

    export enum stateList {
        //% block="on"
        on = 14,
        //% block="off"
        off = 15
    }
    let TStoSendStr = ""

    serial.onDataReceived("\n", function () {
        let serial_str = serial.readString()
        if (serial_str.includes("WIFI GOT IP")) {
            if (CMD == 0x01) {
                wifi_connected = true
                control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 1)
            }
        }
        else if (serial_str.includes("ERROR")) {
            if (CMD == 0x01) {
                wifi_connected = false
                control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 1)
            }
            else if (CMD == 0x02) {
                thingspeak_connected = false
                control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 2)
            }
            else if (CMD == 0x04) {
                kidsiot_connected = false
                control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 4)
            }
        }
        else if (serial_str.includes("CONNECT")) {
            if (CMD == 0x02) {
                thingspeak_connected = true
                control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 2)
            }
            else if (CMD == 0x04) {
                control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 4)
            }
        }
        else if (serial_str.includes("bytes")) {
            kidsiot_connected = true
            control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 5)
        }
        else if (serial_str.includes("switchoff")) {
            control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 15)
        }
        else if (serial_str.includes("switchon")) {
            control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 14)
        }
        else if (serial_str.includes("CLOSE")) {

        }
        else if (serial_str.includes("WIFI DISCONNECT")) {
            basic.showIcon(IconNames.Heart)
            wifi_connected = false
        }
    })

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 0) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
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
        serial.redirect(tx, rx, BaudRate.BaudRate115200)
        basic.pause(100)
        serial.setTxBufferSize(64)
        serial.setRxBufferSize(64)
        serial.readString()
        sendAT("AT+RESTORE", 2500) // restore to factory settings
        sendAT("ATE0", 1500) // disable echo
        sendAT("AT+CWMODE=1", 1500) // set to STA mode
    }
    /**
    * connect to Wifi router
    */
    //% block="connect Wifi SSID = %ssid|KEY = %pw"
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw weight=95
    export function connectWifi(ssid: string, pw: string) {
        CMD = 0x01
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        control.waitForEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 1)
    }
    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Wifi connected %State" weight=70
    export function wifiState(state: boolean) {
        return wifi_connected == state
    }
    /**
    * Connect to ThingSpeak
    */
    //% block="connect thingspeak"
    //% write_api_key.defl=your_write_api_key
    //% subcategory="ThingSpeak" weight=90
    export function connectThingSpeak() {
        CMD = 0x02
        let text = "AT+CIPSTART=\"TCP\",\"api.thingspeak.com\",80"
        sendAT(text, 0) // connect to website server
        control.waitForEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 2)
    }
    /**
    * Connect to ThingSpeak and set data. 
    */
    //% block="set data to send ThingSpeak | Write API key = %write_api_key|Field 1 = %n1||Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% write_api_key.defl=your_write_api_key
    //% expandableArgumentMode="enabled"
    //% subcategory="ThingSpeak" weight=85
    export function setData(write_api_key: string, n1: number = 0, n2: number = 0, n3: number = 0, n4: number = 0, n5: number = 0, n6: number = 0, n7: number = 0, n8: number = 0) {
        TStoSendStr = "GET /update?api_key="
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
        sendAT("AT+CIPSEND=" + (TStoSendStr.length + 2), 300)
        sendAT(TStoSendStr, 300) // upload data
    }

    /**
    * Check if ESP8266 successfully connected to ThingSpeak
    */
    //% block="ThingSpeak connected %State"
    //% subcategory="ThingSpeak" weight=65
    export function thingSpeakState(state: boolean) {
        return thingspeak_connected == state
    }
    /*-----------------------------------kidsiot---------------------------------*/
    /**
    * Connect to kidsiot
    */
    //% subcategory=KidsIot weight=50
    //% blockId=initkidiot block="Connect KidsIot with userToken: %userToken Topic: %topic"
    export function connectKidsiot(userToken: string, topic: string): void {
        userToken_def = userToken
        topic_def = topic
        CMD = 0x04
        sendAT("AT+CIPSTART=\"TCP\",\"139.159.161.57\",5555", 0) // connect to website server
        control.waitForEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 4)
        let jsonText = "{\"topic\":\"" + topic + "\",\"userToken\":\"" + userToken + "\",\"op\":\"init\"}"
        sendAT("AT+CIPSEND=" + (jsonText.length + 2), 300)
        sendAT(jsonText, 0)
        control.waitForEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 5)
    }
    /**
    * upload data to kidsiot
    */
    //% subcategory=KidsIot weight=45
    //% blockId=uploadkidsiot block="Upload data %data to kidsiot"
    export function uploadKidsiot(data: number): void {
        if (kidsiot_connected) {
            data = Math.floor(data)
            let jsonText = "{\"topic\":\"" + topic_def + "\",\"userToken\":\"" + userToken_def + "\",\"op\":\"up\",\"data\":\"" + data + "\"}"
            sendAT("AT+CIPSEND=" + (jsonText.length + 2), 300)
            sendAT(jsonText, 0)
        }
    }
    /**
* disconnect from kidsiot
*/
    //% subcategory=KidsIot weight=40
    //% blockId=Disconnect block="Disconnect with kidsiot"
    export function disconnectKidsiot(): void {
        if (kidsiot_connected) {
            let text_one = "{\"topic\":\"" + topic_def + "\",\"userToken\":\"" + userToken_def + "\",\"op\":\"close\"}"
            sendAT("AT+CIPSEND=" + (text_one.length + 2), 300)
            sendAT(text_one, 0)
        }
    }
    //% block="When switch %vocabulary"
    //% subcategory="KidsIot" weight=30
    //% state.fieldEditor="gridpicker" state.fieldOptions.columns=2
    export function iotSwitchEvent(state: stateList, handler: () => void) {
        control.onEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, state, handler)
    }
    /*----------------------MQTT----------------*/

}