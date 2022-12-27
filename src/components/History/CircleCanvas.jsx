import React from "react"
import Canvas from "./Canvas"
import { codes, codeDef } from "../Globals"

export const CircleCanvas = ({ width, data }) => {
    const drawCircle = (ctx) => {
        var drawClockTick = function (ctx, center, radius, angle, text) {
            // console.log(" center:" + center + " radius:" + radius + " angle:" + angle + " text:" + text)
            ctx.beginPath();
            const tickLength = 5;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            const x2 = center + (radius + tickLength) * Math.cos(angle);
            const y2 = center + (radius + tickLength) * Math.sin(angle);
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            const w = ctx.measureText(text).width;
            const h = 10;
            const r = 1 + 0.5 * Math.sqrt(w * w + h * h);
            const xt = center + (radius + tickLength + r) * Math.cos(angle) - w / 2;
            const yt = center + (radius + tickLength + r) * Math.sin(angle) + h / 2;
            ctx.fillText(text, xt, yt);
            ctx.closePath()
        };

        const drawPieSlice = (ctx, color, startAngle, endAngle, center, radius) => {

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.moveTo(center, center);
            const x = center + radius * Math.cos(startAngle);
            const y = center + radius * Math.sin(startAngle);
            ctx.lineTo(x, y);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.lineTo(center, center);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
        }

        var i
        const startingHour = data.limits[0];
        const hourCount = data.limits[1] - startingHour

        const radPerTime = (Math.PI * (5 / 3)) / (3600 * hourCount);
        const tickSpaceRad = (Math.PI * (5 / 3)) / (hourCount);

        const indent = 35
        const center = ctx.canvas.width / 2
        const radius = center - indent

        ctx.beginPath()
        ctx.arc(center, center, radius, 0, 2 * Math.PI)
        ctx.stroke()

        var startAngle = Math.PI * (2 / 3)
        var endAngle

        //draw clock tick marks and numbers
        for (i = 0; i <= hourCount; i++) {
            drawClockTick(ctx, center, radius, startAngle + i * tickSpaceRad, startingHour + i)
        }

        // Fill in all the data for the day
        let prev = 0;
        // let dbCodes = JSON.parse(data.codes);
        let dbCodes = data.codes;

        dbCodes.forEach(pt => {
            const time = pt[0]
            const code = prev;
            prev = pt[1]
            endAngle = Math.PI * (2 / 3) + radPerTime * time;
            drawPieSlice(ctx, codes[code].color, startAngle, endAngle, center, radius)
            startAngle = endAngle
        })

        //Add last night time slice

        endAngle = Math.PI * (2 / 3) + radPerTime * 3600 * hourCount
        drawPieSlice(ctx, codes[codeDef.IT_IS_DARK].color, startAngle, endAngle, center, radius)

        // clear out teh center of the circle
        ctx.strokeStyle = "#FFFFFF";
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(center, center, radius * 0.6, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();

        //write the day name in it
        //add text for the day (day or week and mm/dd)
        const dtNow = new Date()
        const dtStart = new Date(data.date * 1000)
        const DayOfWeek = dtStart.toLocaleDateString('en-US', { weekday: 'long' })
        const month = dtStart.getMonth() + 1;
        const dateString = month + "/" + dtStart.getDate();
        const itIsToday = (dtNow.getDate() === dtStart.getDate())
        ctx.fillStyle = "black";
        ctx.beginPath();
        if (itIsToday) {
            ctx.fillText("Today", center - ctx.measureText("Today").width / 2, center - 15);
        }
        ctx.fillText(DayOfWeek, center - ctx.measureText(DayOfWeek).width / 2, center - 0);
        ctx.fillText(dateString, center - ctx.measureText(dateString).width / 2, center + 15);

        ctx.stroke();
        ctx.closePath();
    }

    return <Canvas draw={drawCircle} width={width} height={width} data={data} />
}

export default CircleCanvas