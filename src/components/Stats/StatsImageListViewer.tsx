import React, { useState, useEffect, useRef } from 'react';
import { Col, Modal, Button, Form, Row } from 'react-bootstrap';
import './stats.css';

interface ImageListViewerProps {
    imageList: string[];
    url: string;
}

/**
 * ImageListViewer displays a modal image viewer with slider and navigation for a list of images.
 * @param props - The image list and base URL.
 * @returns {React.ReactElement} The rendered image list viewer.
 */
export function ImageListViewer({ imageList, url }: ImageListViewerProps): React.ReactElement {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
    const [sliderValue, setSliderValue] = useState<number>(0);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    const openModal = (index: number) => {
        console.log("Opening modal for image:", url + imageList[index]);
        setCurrentImageIndex(index);
        setSliderValue(index);
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handlePrev = () => {
        setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
        setSliderValue((prev) => (prev > 0 ? prev - 1 : prev));
    };

    const handleNext = () => {
        setCurrentImageIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : prev));
        setSliderValue((prev) => (prev < imageList.length - 1 ? prev + 1 : prev));
    };

    const downloadImage = async () => {
        const response = await fetch(url + imageList[currentImageIndex]);
        const blob = await response.blob();
        const urlObject = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = urlObject;
        link.download = imageList[currentImageIndex];
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(urlObject);
    };

    useEffect(() => {
        if (showModal && imageRef.current) {
            const img = imageRef.current;
            if (img.complete) {
                setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }
        }
    }, [currentImageIndex, showModal]);

    return (
        <Row>
            <Col xs={12} >
                <Button
                    variant="primary"
                    onClick={() => openModal(Math.floor(imageList.length / 2))}
                    disabled={imageList.length === 0}
                >View Images</Button>
                {/* {imageList.length > 0 && imageList.length < 500 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {imageList.map((item: string, index: number) => {
                        const match = item.match(/(\d+)\.jpg$/);
                        const number = match ? match[1] : "";
                        return (
                            <div
                                key={index}
                                style={{
                                    cursor: "pointer",
                                    padding: "4px 8px",
                                    backgroundColor: "#f1f1f1",
                                    borderRadius: "4px",
                                }}
                                onClick={() => openModal(index)}
                            >
                                {number}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <>
                    <p>{imageList.length} images available for selected range.</p>
                    {imageList.length > 500 && <p>Too many images, please narrow range.</p>}
                </>
            )} */}

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
                            Image Viewer - {imageList[currentImageIndex]} ({imageDimensions.width}px × {imageDimensions.height}px)
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ textAlign: 'center' }}>
                        <img
                            ref={imageRef}
                            src={url + imageList[currentImageIndex]}
                            alt={`Image ${currentImageIndex}`}
                            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh' }}
                            onLoad={(event) => {
                                const img = event.target as HTMLImageElement;
                                setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                            }}
                        />
                    </Modal.Body>
                    <Modal.Footer>
                        <Form.Range
                            min={0}
                            max={imageList.length - 1}
                            value={sliderValue}
                            onChange={(e) => setSliderValue(parseInt(e.target.value))}
                            onMouseUp={() => setCurrentImageIndex(sliderValue)}
                            onTouchEnd={() => setCurrentImageIndex(sliderValue)}
                            style={{ width: "100%" }}
                        />
                        <Button
                            style={{ backgroundColor: currentImageIndex === 0 ? 'lightgrey' : 'blue', borderColor: 'transparent' }}
                            onClick={handlePrev}
                            disabled={currentImageIndex === 0}
                        >
                            &lt;
                        </Button>
                        <Button
                            style={{ backgroundColor: currentImageIndex === imageList.length - 1 ? 'lightgrey' : 'blue', borderColor: 'transparent' }}
                            onClick={handleNext}
                            disabled={currentImageIndex === imageList.length - 1}
                        >
                            &gt;
                        </Button>
                        <Button variant="success" onClick={downloadImage}>
                            Save
                        </Button>
                        <Button variant="secondary" onClick={closeModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Col>
        </Row >
    );
};

export default ImageListViewer;
