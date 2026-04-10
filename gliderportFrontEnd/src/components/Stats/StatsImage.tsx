import React, { useState, useEffect, forwardRef, useRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Row, Col, Button, Form, Table, Card, Modal } from 'react-bootstrap';
import StatsImageListViewer from './StatsImageListViewer';
import { API } from '@/api';

const abbrMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CustomInput = forwardRef(
    ({ value, onClick, className }: any, ref: any) => (
        <>
            <h5>Pick a date:</h5>
            <button className={className} onClick={onClick} ref={ref}>
                {value}
            </button>
        </>
    )
);

interface StatsImageComponentProps { }

/**
 * StatsImageComponent displays a date picker, camera selector, image/video details,
 * and a list of images for the selected day and hour range.
 * @returns {React.ReactElement} The rendered stats image component.
 */
export function StatsImageComponent(): React.ReactElement {
    // Date and listing state (for date filtering)
    const [pickedDate, setPickedDate] = useState(new Date());
    const [listing, setListing] = useState<any>({});
    const [years, setYears] = useState<string[]>([]);
    const [months, setMonths] = useState<string[]>([]);

    // States for imageDetails and cameraDetails
    const [imageDetails, setImageDetails] = useState<any>(null);
    const [cameraDetails, setCameraDetails] = useState<any>(null);
    const [camera, setCamera] = useState<"CameraA" | "CameraB">("CameraA");

    const [hourRange, setHourRange] = useState([0, 0]);
    const [toHourOptions, setToHourOptions] = useState<number[]>([]);
    const [fromHourOptions, setFromHourOptions] = useState<number[]>([]);
    const [imageList, setImageList] = useState<string[]>([]);
    const [video, setVideo] = useState<string>("")
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [imageDay, setImageDay] = useState<string | null>(null);


    useEffect(() => {
        if (imageDetails) {
            setCameraDetails(imageDetails[camera]);
            if (Array.isArray(imageDetails.video) && imageDetails.video.length == 2)
                setVideo(camera == "CameraA" ? imageDetails.video[0] : imageDetails.video[1]);
            setHourRange([new Date(imageDetails[camera].starting.time).getHours(), new Date(imageDetails[camera].ending.time).getHours()]);
        } else {
            setCameraDetails(null);
            setVideo("");
            setHourRange([0, 0]);
        }
    }, [imageDetails, camera])

    useEffect(() => {
        if (!imageDetails) return;
        const toOptions = [];
        const lastHour = new Date(imageDetails[camera].ending.time).getHours();
        for (let i = hourRange[0] + 1; i <= lastHour; i++) {
            toOptions.push(i);
        }
        setToHourOptions(toOptions);
        const fromOptions = [];
        const firstHour = new Date(imageDetails[camera].starting.time).getHours();
        for (let i = firstHour; i < hourRange[1]; i++) {
            fromOptions.push(i);
        }
        setFromHourOptions(fromOptions);


        fetch(API.imageCount(imageDay!, hourRange[0], hourRange[1], camera === 'CameraA' ? 1 : 2))
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }
                setImageList(data.files);
            })
            .catch((err) => {
                console.error("Error fetching image list:", err);
                setImageList([]);
            });

    }, [hourRange]);

    // Fetch listing data for date selection when component mounts
    useEffect(() => {
        fetch(API.listing())
            .then((response) => response.json())
            .then((data) => {
                setListing(data);
                const yearKeys = Object.keys(data).sort();
                setYears(yearKeys);
                // Use the latest year if available to pre-populate months
                if (yearKeys.length > 0) {
                    const m: string[] = [];
                    Object.keys(data[yearKeys[yearKeys.length - 1]]).forEach((v) => {
                        m.push(abbrMonths[parseInt(v, 10) - 1]);
                    });
                    setMonths(m);
                }
            })
            .catch((err) => {
                console.log("Error Reading Listing: ", err);
            });
    }, []);

    // Fetch image data based on pickedDate
    useEffect(() => {
        const year = pickedDate.getFullYear();
        const month = (pickedDate.getMonth() + 1).toString().padStart(2, "0");
        const day = pickedDate.getDate().toString().padStart(2, "0");
        const key = `${year}-${month}-${day}`;
        fetch(API.getImageData(year, month))
            .then((response) => response.json())
            .then((data) => {
                if (data.hasOwnProperty(key)) {
                    setImageDay(key);
                    setImageDetails(data[key]);
                } else {
                    setImageDetails(null);
                    setImageDay(null);
                }
            })
            .catch((err) => {
                console.log("Error Reading Image Data: ", err);
            });
    }, [pickedDate]);

    // Update cameraDetails whenever imageDetails or camera changes, update the possible range of hours
    useEffect(() => {
        if (imageDetails) {
            setCameraDetails(imageDetails[camera]);
            const fHour = new Date(imageDetails[camera].starting.time).getHours();
            const lHour = new Date(imageDetails[camera].ending.time).getHours();
            const validLastHour = lHour > fHour ? lHour : fHour + 1;
            setHourRange([fHour, validLastHour]);
            if (Array.isArray(imageDetails.video) && imageDetails.video.length == 2)
                setVideo(camera == "CameraA" ? imageDetails.video[0] : imageDetails.video[1])
        }
    }, [imageDetails, camera]);


    function afterOpenModal() {
        if (videoRef?.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
    }

    const getImageDirectoryUrl = () => {
        const [year, month] = imageDay!.split('-');
        return `${import.meta.env.VITE_SERVER_URL}/images/${year}/${month}/${imageDay}/`;
    }

    // Handler for clicking an image item
    const handleImageClick = (item: string) => {
        //split imageDay on'-' to get year, month and day
        const [year, month] = imageDay!.split('-');
        const itemUrl = `${import.meta.env.VITE_SERVER_URL}/images/${year}/${month}/${imageDay}/${item}`;
        fetch(itemUrl)
            .then((res) => res.json())
            .then((data) => {
                console.log("Fetched image data:", data);
                // Process fetched data as needed.
            })
            .catch((err) => console.error("Error fetching image:", err));
    };

    const [showModal, setShowModal] = useState<boolean>(false);
    const closeModal = () => setShowModal(false);

    const openVideoModal = () => {
        const [year] = imageDay!.split("-");
        const videoUrl = `${import.meta.env.VITE_SERVER_URL}/images/video/${year}/${video}`;
        setSelectedVideo(videoUrl);
        setShowModal(true);
    };

    return (
        <Row className="blueBorder">
            <Row>
                <Col xs={12}>
                    <center>
                        <h4>Past Videos</h4>
                    </center>
                </Col>
            </Row>

            {/* DatePicker and Camera Selection Row */}
            <Row
                style={{
                    backgroundColor: "#e7f3ff",
                    marginBottom: "20px",
                    paddingTop: "10px",
                    paddingBottom: "20px",
                }}
            >
                <Col xs={6} className="text-center">
                    <DatePicker
                        renderCustomHeader={({
                            date,
                            changeYear,
                            changeMonth,
                            decreaseMonth,
                            increaseMonth,
                            prevMonthButtonDisabled,
                            nextMonthButtonDisabled,
                        }) => (
                            <div
                                style={{
                                    margin: 10,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <select
                                    style={{ marginLeft: "20px" }}
                                    value={date.getFullYear()}
                                    onChange={({ target: { value } }) => {
                                        changeYear(parseInt(value, 10));
                                        const m: string[] = [];
                                        if (listing[value]) {
                                            Object.keys(listing[value]).forEach((v) => {
                                                m.push(abbrMonths[parseInt(v, 10) - 1]);
                                            });
                                        }
                                        setMonths(m);
                                    }}
                                >
                                    {years.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    style={{ marginRight: "20px" }}
                                    value={months[date.getMonth()]}
                                    onChange={({ target: { value } }) => {
                                        changeMonth(abbrMonths.indexOf(value));
                                    }}
                                >
                                    {months.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        selected={pickedDate}
                        onChange={(date) => setPickedDate(date!)}
                        filterDate={(date) => {
                            const year = date.getFullYear();
                            const month = date.getMonth() + 1;
                            const day = date.getDate();
                            if (!listing[year] || !listing[year][month]) return false;
                            return listing[year][month].includes(day);
                        }}
                        customInput={<CustomInput className="example-custom-input" />}
                    />
                </Col>
                <Col xs={6} className="text-center">
                    <h5>Camera</h5>
                    <Button
                        style={{ backgroundColor: camera === "CameraA" ? "blue" : "lightgray" }}
                        onClick={() => setCamera("CameraA")}
                    >
                        A
                    </Button>
                    <Button
                        style={{ backgroundColor: camera === "CameraB" ? "blue" : "lightgray" }}
                        onClick={() => setCamera("CameraB")}
                    >
                        B
                    </Button>
                </Col>
            </Row>

            {imageDetails && cameraDetails &&
                <>
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={2} className="text-start" style={{ fontWeight: "bolder", paddingLeft: "10%" }}>First Image</td>
                            </tr>
                            <tr>
                                <td className="text-end">File</td>
                                <td className="text-start">{cameraDetails.starting.file}</td>
                            </tr>
                            <tr>
                                <td className="text-end">Time</td>
                                <td className="text-start">
                                    {new Date(cameraDetails.starting.time).toLocaleTimeString()}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={2} className="text-start" style={{ fontWeight: "bolder", paddingLeft: "10%" }}>Last Image</td>
                            </tr>
                            <tr>
                                <td className="text-end">File</td>
                                <td className="text-start">{cameraDetails.ending.file}</td>
                            </tr>
                            <tr>
                                <td className="text-end">Time</td>
                                <td className="text-start">
                                    {new Date(cameraDetails.ending.time).toLocaleTimeString()}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={2} className="text-start" style={{ fontWeight: "bolder", paddingLeft: "10%" }}>Other Settings</td>
                            </tr>
                            <tr>
                                <td className="text-center" colSpan={2}>Files are {cameraDetails.isContinuous === true ? "continuous" : "not Continuous"}</td>
                            </tr>
                            <tr>
                                <td className="text-end">Files Range</td>
                                <td className="text-start">
                                    {(10000 + cameraDetails.smallestIndex).toString() +
                                        " to " +
                                        (10000 + cameraDetails.largestIndex).toString()}
                                </td>
                            </tr>
                            <tr>
                                <td className="text-end">Video</td>
                                <td className="text-start" style={{ cursor: "pointer", color: "blue" }} onClick={openVideoModal}>
                                    {video}</td>
                            </tr>
                        </tbody>
                    </Table>

                    <Row
                        style={{
                            backgroundColor: "#e7f3ff",
                            marginBottom: "20px",
                            padding: "10px",
                        }}
                    >
                        <Col xs={12} className="text-center">
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    fontSize: "1.2em",
                                }}
                            >
                                <span>Enter an hour range</span>
                                {/* <Form.Check
                                    type="checkbox"
                                    id="hourRangeCheckbox"
                                    checked={enterRange}
                                    onChange={(e) => setEnterRange(e.target.checked)}
                                    style={{
                                        transform: "scale(1.5)",
                                        marginLeft: "10px",
                                        marginTop: "12px",
                                    }}
                                /> */}
                            </div>
                        </Col>

                        <Col xs={12} className="text-center" style={{ marginTop: "10px" }}>
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "10px",
                                }}
                            >
                                <span>From:</span>
                                <Form.Select
                                    id="fromHourSelect"
                                    value={hourRange[0]}
                                    onChange={(e) => {
                                        const s = [parseInt(e.target.value, 10), hourRange[1]];
                                        setHourRange(s);
                                    }}
                                    style={{ width: "90px", textAlign: "center" }}
                                >
                                    {fromHourOptions.map((h) => (
                                        <option key={h} value={h}>
                                            {h}
                                        </option>
                                    ))}
                                </Form.Select>
                                <span>To:</span>
                                <Form.Select
                                    id="toHourSelect"
                                    value={hourRange[1]}
                                    onChange={(e) => {
                                        const s = [hourRange[0], parseInt(e.target.value, 10)];
                                        setHourRange(s);
                                    }}
                                    style={{ width: "90px", textAlign: "center" }}
                                >
                                    {toHourOptions.map((h) => (
                                        <option key={h} value={h}>
                                            {h}
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                        </Col>

                    </Row>


                    <StatsImageListViewer imageList={imageList} url={getImageDirectoryUrl()} />

                    {/* <Row>
                        <Col xs={12}>
                            <center>
                                <h5 style={{ marginTop: '20px' }}>
                                    <button className="btn btn-primary"
                                        onClick={e => setModalIsOpen(true)}>
                                        Play {selectedVideo}
                                    </button>
                                </h5>
                            </center>
                        </Col>
                    </Row> */}
                </>}


            <Modal
                show={showModal}
                onHide={closeModal}
                dialogClassName="modal-90w"
                aria-labelledby="image-viewer-modal"
                size="xl"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title id="image-viewer-modal">
                        {selectedVideo}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ textAlign: 'center' }}>
                    <video ref={videoRef} controls autoPlay preload="none" style={{ width: "100%" }}>
                        <source src={selectedVideo || ""} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </Modal.Body>
                <Modal.Footer>

                </Modal.Footer>
            </Modal>
        </Row>
    );
};

export default StatsImageComponent;
