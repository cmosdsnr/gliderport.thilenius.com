import React, { useState, useEffect, useRef, forwardRef, JSX } from 'react'
import 'react-datepicker/dist/react-datepicker.css';
import { Row, Col, Form } from 'react-bootstrap'
import { useData } from 'contexts/DataContext'
import './stats.css'
import StatsImageComponent from './StatsImage';
import StatsHitsComponent from './StatsHits';
import StatsChangeLogComponent from './StatsChangeLog';
import StatsUsefulLinksComponent from './StatsUsefulLinks';

export default function StatsPage() {
    return (
        <>
            <Row>
                <Col xs={12} md={6} className="stats-col">

                    <StatsHitsComponent />
                    <StatsImageComponent />
                    <StatsUsefulLinksComponent />
                </Col >

                <Col xs={12} md={6} className="leftBorder">
                    <StatsChangeLogComponent />
                </Col>
            </Row >


        </>
    )
}

// var lineInc = 2,
//     majMarkDegree = 10,
//     degreeInc = 30,
//     compassRose = document.getElementById("compassRose"),
//     xmlns = "http://www.w3.org/2000/svg",
//     xlink = "http://www.w3.org/1999/xlink";
// if (lineInc > 0) {
//     for (i = 0; i < 360; i += lineInc) {
//         var newline = document.createElementNS(xmlns, 'use');
//         if (i % majMarkDegree == 0) {
//             newline.setAttributeNS(xlink, 'xlink:href', '#majLine');
//         } else {
//             newline.setAttributeNS(xlink, 'xlink:href', '#roseLine');
//         }
//         newline.setAttributeNS(null, 'transform', 'rotate(' + i + ' 250 250)');
//         compassRose.appendChild(newline);
//     }
// }
// var writeDegrees = document.createElementNS(xmlns, 'text'),
//     currentDeg = 0,
//     writeOffset = 0;
// for (i = 0; i < 99; i += (degreeInc / 360) * 100) {
//     var degree = document.createElementNS(xmlns, 'textPath');
//     degree.setAttributeNS(xlink, 'xlink:href', '#roseCircle');
//     var length = Math.log(i) * Math.LOG10E + 1 | 0;
//     if (length > 1) { writeOffset = 1; }
//     degree.setAttributeNS(null, 'startOffset', (i - writeOffset) + "%");
//     degree.textContent = 360 - currentDeg;
//     if (degree.textContent == 360) degree.textContent = 0;
//     writeDegrees.appendChild(degree);
//     currentDeg += degreeInc;
// }
// compassRose.appendChild(writeDegrees);