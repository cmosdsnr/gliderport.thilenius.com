/**
 * @packageDocumentation
 * Status page for the Gliderport application.
 * Displays the Gliderport Internet Status History and a visual history of online/offline status.
 */
import React, { useState, useEffect, useRef } from 'react'
import { Row, Col } from 'react-bootstrap'
import StatusCanvas from './StatusCanvas'
import { pb } from '@/contexts/pb'
import { ToId } from '@/util/ToId'
import { useStatusCollection } from 'contexts/StatusCollection'
import { DateTime } from 'luxon';

/**
 * Status component displays the Gliderport Internet Status History.
 * Shows a visual history of online/offline status and the last check time.
 * @returns {React.ReactElement} The rendered status history component.
 */
export function Status(): React.ReactElement {
    const rowRef = useRef<HTMLDivElement>(null)
    const width = useRef<number>(0)
    const [lastStatus, setLastStatus] = useState("")
    const [dayLabels, setDayLabels] = useState<string[]>([])
    const [days, setDays] = useState([] as any[])
    const { online } = useStatusCollection()  // latest status


    const loadData = async () => {
        const status = [];
        let day = [];
        let dayLbl = [];

        let dt = DateTime.local().minus({ days: 14 }).startOf('day')
        let ts = dt.toSeconds();
        dayLbl.push(dt.toFormat('MM-dd'));
        const before = await pb.collection("networkStatus").getList(1, 1, {
            filter: `id <= "${ToId(ts.toString())}"`,
            sort: "-id"
        });
        const stats = await pb.collection("networkStatus").getFullList({
            filter: `id >= "${before.items[0].id}"`
        });
        if (stats.length === 0) {
            console.log("No network status records found.");
            return;
        }
        let lastStat = stats[0].online ? 1 : 0;
        let idx = 1;
        for (let i = 0; i < 14; i++) {
            day = [[0, lastStat]];
            while (stats[idx] && (parseInt(stats[idx].id) - ts < 24 * 3600)) {
                lastStat = stats[idx].online ? 1 : 0;
                day.push([parseInt(stats[idx].id) / 86400 - ts, lastStat]);
                idx++;
            }
            if (i == 13) {
                lastStat = 2;
                const d = DateTime.fromSeconds(online.touched).toLocal();
                const s = d.hour * 3600 + d.minute * 60 + d.second;
                day.push([s / 86400, lastStat]);
            }
            status.push(day);
            dt = dt.plus({ days: 1 });
            ts = dt.toSeconds();
            dayLbl.push(dt.toFormat('MM-dd'));

        }
        setDays(status);
        setDayLabels(dayLbl);
    }

    useEffect(() => {
        if (!online?.touched || days.length === 0) return;

        const newDays = [...days];
        const lastDay = [...newDays[newDays.length - 1]];

        const d = DateTime.fromSeconds(online.touched).toLocal();
        const s = d.hour * 3600 + d.minute * 60 + d.second;
        const lastIndex = lastDay.length - 1;

        // Replace the last entry if its 's' is the previous 'online.touched' % 86400 or status is 2
        if (lastDay[lastIndex].status === 2 || lastDay[lastIndex].s === s) {
            lastDay[lastIndex] = [s / 86400, 2];
        } else {
            lastDay.push([s / 86400, 2]);
        }

        newDays[newDays.length - 1] = lastDay;
        setDays(newDays);
        const dt = DateTime.fromSeconds(online.touched).toLocal();
        setLastStatus(dt.toLocaleString(DateTime.DATETIME_MED));
    }, [online.touched]);

    useEffect(() => {
        loadData();
        const resizeAndDraw = () => {
            const divContainer = rowRef.current
            if (!divContainer) {
                console.log("no container")
                return
            }
            width.current = divContainer.clientWidth
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])

    return (
        <>
            <Row>
                <Col xs={{ offset: 3, span: 6 }} style={{ textAlign: 'center' }}>
                    <h4>Gliderport Internet Status History</h4>
                    <p>red indicates the gliderports internet is down (either power failure or internet issues)</p>
                    <p>green indicates the data/images/video should be available</p>
                    <p>Status was last checked on {lastStatus}</p>
                </Col>
            </Row>
            <Row ref={rowRef}>
                {days?.map((day, i) => {
                    return (
                        <StatusCanvas key={i} width={width.current} data={day} lastOne={i === 13} dayLabel={dayLabels[i]} />
                    )
                })
                }
            </Row >
            <Row style={{ height: '200px' }}>
            </Row>
        </>
    )
}

export default Status;
