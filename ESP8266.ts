//% color=#0fbc11 icon="\uf1eb"
namespace ESP8266_IoT {

    type MsgHandler = { 
        [key: string]: { 
            [key: string]: any 
        } 
    }

    let wifi_connected = false;
    const msgHandlerMap: MsgHandler = {};

    // write AT command with CR+LF ending
    export function sendAT(command: string, wait: number = 0) {
        serial.writeString(`${command}\u000D\u000A`)
        basic.pause(wait)
    }

    export function registerMsgHandler(key: string, handler: (res: string) => void){
        msgHandlerMap[key] = {
            handler, 
            type: 0,
        }
    }

    export function waitForResponse(key: string, wait: number) :string{
        let timeout = input.runningTime() + wait;
        msgHandlerMap[key] = {
            type: 1,
        }
        while(timeout > input.runningTime()){
            if (!msgHandlerMap[key]){
                return null;
            } else if (msgHandlerMap[key].msg){
                let res = msgHandlerMap[key].msg
                delete msgHandlerMap[key]
                return res
            }
            basic.pause(1);
        }
        delete msgHandlerMap[key]
        return null;
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
        serial.setTxBufferSize(128)
        serial.setRxBufferSize(128)
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), serialDataHandler)
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+RST", 1000) // rest
        sendAT("AT+CWMODE=1", 500) // set to STA mode
        sendAT("AT+SYSTIMESTAMP=1634953609130", 100) // Set local timestamp.
        sendAT(`AT+CIPSNTPCFG=1,8,"ntp1.aliyun.com","0.pool.ntp.org","time.google.com"`, 100)
        waitForResponse("AT+CIPSNTPCFG", 10000);
    }

    /**
     * connect to Wifi router
     */
    //% block="connect Wifi SSID = %ssid|KEY = %pw"
    //% ssid.defl=your_ssid
    //% pw.defl=your_pwd weight=95
    export function connectWifi(ssid: string, pw: string) {
        sendAT(`AT+CWJAP="${ssid}","${pw}"`) // connect to Wifi router
        registerMsgHandler("WIFI DISCONNECT", () => wifi_connected = false)
        registerMsgHandler("WIFI GOT IP", () => wifi_connected = true)
        let timeout = input.runningTime() + 5000;
        while (!wifi_connected && timeout > input.runningTime()){
            basic.pause(5);
        }
    }

    /**
     * Warning: Deprecated.
     * Check if ESP8266 successfully connected to Wifi
     */
    //% block="Wifi connected %State" weight=70
    export function wifiState(state: boolean) {
        return wifi_connected === state
    }

    /*
     * on serial received data
     */
    let log = ""
    export function getLog():string{
        return log;
    }
    function serialDataHandler(){
        const res = serial.readLine();
        log+=res;
        Object.keys(msgHandlerMap).forEach(key => {
            if (!res.includes(key)){
                return;
            }
            if (msgHandlerMap[key].type == 0){
                msgHandlerMap[key].handler(key)
            }else {
                msgHandlerMap[key].msg = res;
            }
        })
    }

    // serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function() {
        // recvString += serial.readString()
        // pause(1)

        // if (recvString.includes("MQTTSUBRECV")) {
        //     recvString = recvString.slice(recvString.indexOf("MQTTSUBRECV"))
        //     const recvStringSplit = recvString.split(",", 4)
        //     const topic = recvStringSplit[1].slice(1, -1)
        //     const message = recvStringSplit[3].slice(0, -2)
        //     mqttSubscribeHandlers[topic] && mqttSubscribeHandlers[topic](message)
        //     recvString = ""
        // }

        // switch (currentCmd) {
        //     case Cmd.ConnectWifi:
        //         if (recvString.includes("AT+CWJAP")) {
        //             recvString = recvString.slice(recvString.indexOf("AT+CWJAP"))
        //             if (recvString.includes("WIFI GOT IP")) {
        //                 wifi_connected = true
        //                 recvString = ""
        //                 control.raiseEvent(EspEventSource, EspEventValue.ConnectWifi)
        //             } else if (recvString.includes("ERROR")) {
        //                 wifi_connected = false
        //                 recvString = ""
        //                 control.raiseEvent(EspEventSource, EspEventValue.ConnectWifi)
        //             } 
        //         }
        //         break
        //     case Cmd.ConnectMqtt:
        //         if (recvString.includes(mqtthost_def)) {
        //             recvString = recvString.slice(recvString.indexOf(mqtthost_def))
        //             if (recvString.includes("OK")) {
        //                 mqttBrokerConnected = true
        //                 recvString = ""
        //                 control.raiseEvent(EspEventSource, EspEventValue.ConnectMqtt)
        //             } else if (recvString.includes("ERROR")) {
        //                 mqttBrokerConnected = false
        //                 recvString = ""
        //                 control.raiseEvent(EspEventSource, EspEventValue.ConnectMqtt)
        //             }
        //         }
        //         break
        // }
    // })
}
/************************************************************************
 * MQTT
 ************************************************************************/
namespace ESP8266_IoT {

    export enum SchemeList {
        //% block="TCP"
        TCP = 1,
        //% block="TLS"
        TLS = 2
    }

    export enum QosList {
        //% block="0"
        Qos0 = 0,
        //% block="1"
        Qos1,
        //% block="2"
        Qos2
    }

    let mqttBrokerConnected: boolean = false
    let userToken_def: string = ""
    let topic_def: string = ""
    const mqttSubscribeHandlers: { [topic: string]: (message: string) => void } = {}
    const mqttSubscribeQos: { [topic: string]: number } = {}
    let mqtthost_def = "ELECFREAKS"


    /*----------------------------------MQTT-----------------------*/
    /*
     * Set  MQTT client
     */
    //% subcategory=MQTT weight=30
    //% blockId=initMQTT block="Set MQTT client config|scheme: %scheme clientID: %clientID username: %username password: %password path: %path"
    export function setMQTT(scheme: SchemeList, clientID: string, username: string, password: string, path: string): void {
        sendAT(`AT+MQTTUSERCFG=0,${scheme},"${clientID}","${username}","${password}",0,0,"${path}"`, 1000)
    }

    /*
     * Connect to MQTT broker
     */
    //% subcategory=MQTT weight=25
    //% blockId=connectMQTT block="connect MQTT broker host: %host port: %port reconnect: $reconnect"
    export function connectMQTT(host: string, port: number, reconnect: boolean): void {
        // mqtthost_def = host
        // const rec = reconnect ? 0 : 1
        // currentCmd = Cmd.ConnectMqtt
        // sendAT(`AT+MQTTCONN=0,"${host}",${port},${rec}`)
        // control.waitForEvent(EspEventSource, EspEventValue.ConnectMqtt)
        // Object.keys(mqttSubscribeQos).forEach(topic => {
        //     const qos = mqttSubscribeQos[topic]
        //     sendAT(`AT+MQTTSUB=0,"${topic}",${qos}`, 1000)
        // })
    }

    /*
     * Check if ESP8266 successfully connected to mqtt broker
     */
    //% block="MQTT broker is connected"
    //% subcategory="MQTT" weight=24
    export function isMqttBrokerConnected() {
        return mqttBrokerConnected
    }

    /*
     * send message
     */
    //% subcategory=MQTT weight=21
    //% blockId=sendMQTT block="publish %msg to Topic:%topic with Qos:%qos"
    //% msg.defl=hello
    //% topic.defl=topic/1
    export function publishMqttMessage(msg: string, topic: string, qos: QosList): void {
        sendAT(`AT+MQTTPUB=0,"${topic}","${msg}",${qos},0`, 1000)
    }

    /*
     * disconnect MQTT broker
     */
    //% subcategory=MQTT weight=15
    //% blockId=breakMQTT block="Disconnect from broker"
    export function breakMQTT(): void {
        sendAT("AT+MQTTCLEAN=0", 1000)
    }

    //% block="when Topic: %topic have new $message with Qos: %qos"
    //% subcategory=MQTT weight=10
    //% draggableParameters
    //% topic.defl=topic/1
    export function MqttEvent(topic: string, qos: QosList, handler: (message: string) => void) {
        mqttSubscribeHandlers[topic] = handler
        mqttSubscribeQos[topic] = qos
    }

}

/************************************************************************
 * smart_iot
 ************************************************************************/
namespace ESP8266_IoT {

    export enum SmartIotSwitchState {
        //% block="on"
        on = 1,
        //% block="off"
        off = 2
    }

    let SMARTIOT_HOST = "47.239.108.37"
    let SMARTIOT_PORT = "8081"
    let smartiot_connected: boolean = false

    const SmartIotEventSource = 3100
    const SmartIotEventValue = {
        switchOn: SmartIotSwitchState.on,
        switchOff: SmartIotSwitchState.off
    }

    export function setSmartIotAddr(host: any, port: any) {
        SMARTIOT_HOST = host
        SMARTIOT_PORT = port
    }

    /* ----------------------------------- smartiot ----------------------------------- */
    /*
     * Connect to smartiot
     */
    //% subcategory=SmartIot weight=50
    //% blockId=initsmartiot block="Connect SmartIot with userToken: %userToken Topic: %topic"
    export function connectSmartiot(userToken: string, topic: string): void {

    }

    /**
     * upload data to smartiot
     */
    //% subcategory=SmartIot weight=45
    //% blockId=uploadsmartiot block="Upload data %data to smartiot"
    export function uploadSmartiot(data: number): void {

    }

    /*
     * disconnect from smartiot
     */
    //% subcategory=SmartIot weight=40
    //% blockId=Disconnect block="Disconnect with smartiot"
    export function disconnectSmartiot(): void {

    }

    /*
     * Check if ESP8266 successfully connected to SmartIot
     */
    //% block="SmartIot connection %State"
    //% subcategory="SmartIot" weight=35
    export function smartiotState(state: boolean) {
        return false;
    }

    //% block="When switch %vocabulary"
    //% subcategory="SmartIot" weight=30
    //% state.fieldEditor="gridpicker" state.fieldOptions.columns=2
    export function iotSwitchEvent(state: SmartIotSwitchState, handler: () => void) {

    }

}

/************************************************************************
 * thingspeak
 ************************************************************************/
namespace ESP8266_IoT {

    const THINGSPEAK_HOST = "api.thingspeak.com"
    const THINGSPEAK_PORT = "80"

    let thingspeak_connected: boolean = false
    let thingSpeakDatatemp = ""



    /**
     * Connect to ThingSpeak
     */
    //% block="connect thingspeak"
    //% write_api_key.defl=your_write_api_key
    //% subcategory="ThingSpeak" weight=90
    export function connectThingSpeak() {
        thingspeak_connected = true
    }

    /**
     * Connect to ThingSpeak and set data.
     */
    //% block="set data to send ThingSpeak | Write API key = %write_api_key|Field 1 = %n1||Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% write_api_key.defl=your_write_api_key
    //% expandableArgumentMode="enabled"
    //% subcategory="ThingSpeak" weight=85
    export function setData(write_api_key: string, n1: number = 0, n2: number = 0, n3: number = 0, n4: number = 0, n5: number = 0, n6: number = 0, n7: number = 0, n8: number = 0) {
        thingSpeakDatatemp = "AT+HTTPCLIENT=2,0,\"http://api.thingspeak.com/update?api_key="
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
            + "\",,,1"
    }

    /**
     * upload data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
     */
    //% block="Upload data to ThingSpeak"
    //% subcategory="ThingSpeak" weight=80
    export function uploadData() {
        let mscnt = 0
        sendAT(thingSpeakDatatemp, 100) // upload data
        let recvString = ""
        while (1) {

            recvString += serial.readString()
            basic.pause(1)
            mscnt += 1
            if (recvString.includes("OK") || mscnt >= 3000 || recvString.includes("ERROR")) {
                break
            }
        }

        recvString = " "
        basic.pause(200)
    }

    /*
     * Check if ESP8266 successfully connected to ThingSpeak
     */
    //% block="ThingSpeak connected %State"
    //% subcategory="ThingSpeak" weight=65
    export function thingSpeakState(state: boolean) {
        return thingspeak_connected === state
    }

}

/************************************************************************
 * IFTTT
 ************************************************************************/
namespace ESP8266_IoT {


    let iftttkey_def = ""
    let iftttevent_def = ""

    /*
     * set ifttt
     */
    //% subcategory=IFTTT weight=9
    //% blockId=setIFTTT block="set IFTTT key:%key event:%event"
    export function setIFTTT(key: string, event: string): void {
        iftttkey_def = key
        iftttevent_def = event
    }

    /*
     * post ifttt
     */
    //% subcategory=IFTTT weight=8
    //% blockId=postIFTTT block="post IFTTT with|value1:%value value2:%value2 value3:%value3"
    export function postIFTTT(value1: string, value2: string, value3: string): void {
        let sendST1 = "AT+HTTPCLIENT=3,1,\"http://maker.ifttt.com/trigger/" + iftttevent_def + "/with/key/" + iftttkey_def + "\",,,2,"
        let sendST2 = "\"{\\\"value1\\\":\\\"" + value1 + "\\\"\\\,\\\"value2\\\":\\\"" + value2 + "\\\"\\\,\\\"value3\\\":\\\"" + value3 + "\\\"}\""
        let sendST = sendST1 + sendST2
        sendAT(sendST, 1000)
    }

}