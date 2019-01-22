
/**
 * Use this file to define custom functions and blocks.
 * Read more at https://makecode.microbit.org
 */



/**
 * Custom blocks
 */
//% color=#0fbc11 icon="\uf1eb" weight=90

namespace ESP8266_IoT {
    let tobesendstring = ""

    /**
     * TODO: Set pin RX and TX for ESP8266 Serial Wifi Module，Baud rate: 115200.
     * @param wifiRX describe parameter here, eg: SerialPin.P8
     * @param wifiTX describe parameter here, eg: SerialPin.P12
     */
    //% weight=100
    //% blockId="wifi_init" block="set ESP8266 RX %wifiRX| TX %wifiTX|at baud rate %baudrate"
    export function initwifi(wifiRX: SerialPin, wifiTX: SerialPin, baudrate: BaudRate): void {
        serial.redirect(
            wifiRX,
            wifiTX,
            //BaudRate.BaudRate115200
            baudrate
        )
        basic.pause(10)
        serial.writeString("AT+RESTORE" + "\u000D" + "\u000A")
        basic.pause(2000)
        serial.writeString("AT+CWMODE_CUR=1" + "\u000D" + "\u000A")
        basic.pause(5000)

        // Add code here
    }

    /**
     * TODO: connectwifi，Fill in your ssid and your key.
     * @param ssid describe parameter here, eg: "your ssid"
     * @param key describe parameter here, eg: "your key"
     */
    //% weight=99
    //% blockId="wifi_connect" block="connect wifi SSID: %ssid| KEY: %key"
    export function connectwifi(ssid: string, key: string): void {
        // Add code here
        let text = "AT+CWJAP_CUR=\""
                 + ssid
                 + "\",\""
                 + key
                 + "\""
        
        serial.writeString(text + "\u000D" + "\u000A")
        basic.pause(6000)
    }

    /**
     * TODO: connect thingspeak IoT TCP server 
    */
    //% weight=98
    //% blockId="TCP_connect" block="connect thingspeak"
    export function connectthingspeak(): void {
        // Add code here
        let text = "AT+CIPSTART=\"TCP\",\"api.thingspeak.com\",80"
        serial.writeString(text + "\u000D" + "\u000A")
        basic.pause(6000)
    }

    /**
     * TODO: Set data to be sent.
     * @param write_api_key describe parameter here, eg: "your write api key"
     * @param n1 describe parameter here, eg: 0
     * @param n2 describe parameter here, eg: 0
     * @param n3 describe parameter here, eg: 0
     * @param n4 describe parameter here, eg: 0
     * @param n5 describe parameter here, eg: 0
     * @param n6 describe parameter here, eg: 0
     * @param n7 describe parameter here, eg: 0
     * @param n8 describe parameter here, eg: 0
     */
    //% weight=97
    //% blockId="send_text" block="set data to be send : Write API Key= %write_api_key|field1 = %n1|field2 = %n2|field3 = %n3|field4 = %n4|field5 = %n5|field6 = %n6|field7 = %n7|field8 = %n8"
    export function tosendtext(write_api_key: string,
                                n1: number, 
                                n2: number, 
                                n3: number, 
                                n4: number, 
                                n5: number, 
                                n6: number, 
                                n7: number, 
                                n8: number ): void {
        let text=""   
        text = "GET /update?key="
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
        tobesendstring = text              
        // Add code here
    }

    /**
     * TODO: send data
     */
    //% weight=96
    //% blockId=senddata block="send data to thingspeak"
    export function senddata(): void {
        let text = ""
        text = "AT+CIPSEND=" 
            + (tobesendstring.length + 2)
        serial.writeString(text + "\u000D" + "\u000A")
        basic.pause(3000)
        serial.writeString(tobesendstring + "\u000D" + "\u000A")
        basic.pause(6000)
        // Add code here

    }


}
