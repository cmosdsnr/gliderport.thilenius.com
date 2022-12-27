import React from "react"
import Canvas from "./Canvas"
import { codes, codeDef, formatDate } from "../Globals"

export const LineCanvas = ({ width, data }) => {

    const drawLine = (ctx) => {
        const drawLineTick = (ctx, percentageOffset, text) => {
            var x = percentageOffset * width
            ctx.moveTo(x, 30)
            ctx.lineTo(x, 35)
            ctx.stroke()
            ctx.fillText(text, x - ctx.measureText(text).width / 2, 45)
        }

        var i
        const startingHour = data.limits[0];
        const hourCount = data.limits[1] - startingHour

        // Draw a black outline rectangle
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.rect(0, 0, width, 50)
        ctx.stroke()

        for (i = 1; i < hourCount; i++) {
            drawLineTick(ctx, i / hourCount, startingHour + i)
        }

        var startRatio = 0;
        var endRatio = 0;
        var ratioPerSecond = 1 / (3600 * hourCount)

        // Fill in all the data for the day
        let prev = 0;

        //debugger
        // let dbCodes = JSON.parse(data.codes);
        let dbCodes = data.codes;
        //console.log(dbCodes)
        dbCodes.forEach(pt => {
            //console.log(pt)
            const time = pt[0]
            const code = prev
            prev = pt[1]

            endRatio = ratioPerSecond * time
            ctx.beginPath()
            if (!codes[code]) {
                console.log(code)
            }
            ctx.fillStyle = codes[code].color
            ctx.strokeStyle = ctx.fillStyle
            ctx.rect(
                1 + startRatio * (width - 2),
                1,
                (endRatio - startRatio) * (width - 2),
                30
            )
            ctx.stroke()
            ctx.fill()
            startRatio = endRatio
        })

        ctx.beginPath()
        ctx.fillStyle = codes[codeDef.IT_IS_DARK].color
        ctx.strokeStyle = ctx.fillStyle
        ctx.rect(
            1 + startRatio * (width - 2),
            1,
            (1 - startRatio) * (width - 2),
            30
        )
        ctx.stroke()
        ctx.fill()


        //add text for the day (day or week and mm/dd)
        const dtNow = new Date()
        const dtStart = new Date(data.date * 1000)
        const itIsToday = (dtNow.getDate() === dtStart.getDate())
        ctx.fillStyle = "white";
        ctx.beginPath();
        if (itIsToday) {
            ctx.fillStyle = "Darkblue";
            ctx.font = "20px Verdana"
            ctx.fillText("Today", 20, 20);
        }
        else {
            ctx.fillStyle = "white";
            ctx.font = "15px Verdana"
            var text = formatDate(dtStart)
            ctx.fillText(text, 20, 15);
            text = (1 + dtStart.getMonth()) + "/" + dtStart.getDate();
            ctx.fillText(text, 20, 30);
        }
        ctx.stroke();
        ctx.closePath();
    }

    return <Canvas draw={drawLine} height={60} width={width} data={data} />
}

export default LineCanvas