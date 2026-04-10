import React, { useState, useEffect, useRef } from 'react';
import { Col, Modal, Button, Form, Row } from 'react-bootstrap';
import './stats.css';

/**
 * Props for {@link ImageListViewer}.
 */
export interface ImageListViewerProps {
    /**
     * Ordered list of image filenames (without the base URL) to display in the viewer.
     * The modal opens to the middle of the list by default.
     */
    imageList: string[];
    /**
     * Base URL prepended to each filename to form the full image source, e.g.
     * `https://example.com/images/2024/09/2024-09-07/`.  Must include a trailing slash.
     */
    url: string;
}

/**
 * Modal image slider with prev/next navigation, a range slider, and a download button.
 *
 * @remarks
 * Renders a "View Images" button that opens a full-screen Bootstrap `Modal`.
 * Inside the modal the user can:
 * - Step through images one at a time with the `<` / `>` buttons.
 * - Jump to any image by dragging the range slider (the image updates on
 *   mouse/touch release to avoid excessive network requests).
 * - Download the current image via a programmatically triggered `<a>` click
 *   so that the browser saves the file rather than navigating to it.
 *
 * The modal title shows the current filename and its natural pixel dimensions,
 * which are read from the `<img>` element after each load event.
 *
 * @param imageList - Ordered array of image filenames belonging to the selected
 *   day and hour range.  The modal starts at `Math.floor(imageList.length / 2)`.
 * @param url - Base URL (with trailing slash) prepended to each filename.
 * @returns The rendered "View Images" button and associated modal.
 *
 * @example
 * ```tsx
 * <ImageListViewer
 *   imageList={["img_10001.jpg", "img_10002.jpg"]}
 *   url="https://example.com/images/2024/09/2024-09-07/"
 * />
 * ```
 */
export function ImageListViewer({ imageList, url }: ImageListViewerProps): React.ReactElement {
    /** Whether the image-viewer modal is currently visible. */
    const [showModal, setShowModal] = useState<boolean>(false);
    /** Zero-based index of the image currently displayed in the modal. */
    const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
    /**
     * Current range-slider position.  Kept separate from `currentImageIndex` so
     * the image only updates when the user releases the slider (mouse/touch up).
     */
    const [sliderValue, setSliderValue] = useState<number>(0);
    /** Natural pixel dimensions of the currently displayed image, shown in the modal title. */
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    /** Ref to the `<img>` element, used to read `naturalWidth`/`naturalHeight` after load. */
    const imageRef = useRef<HTMLImageElement>(null);

    /**
     * Opens the image viewer modal at the specified index.
     *
     * @param index - Zero-based index into `imageList` to display first.
     */
    const openModal = (index: number) => {
        console.log("Opening modal for image:", url + imageList[index]);
        setCurrentImageIndex(index);
        setSliderValue(index);
        setShowModal(true);
    };

    /** Closes the image viewer modal. */
    const closeModal = () => setShowModal(false);

    /**
     * Moves to the previous image if one exists.
     * Both `currentImageIndex` and `sliderValue` are kept in sync.
     */
    const handlePrev = () => {
        setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
        setSliderValue((prev) => (prev > 0 ? prev - 1 : prev));
    };

    /**
     * Moves to the next image if one exists.
     * Both `currentImageIndex` and `sliderValue` are kept in sync.
     */
    const handleNext = () => {
        setCurrentImageIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : prev));
        setSliderValue((prev) => (prev < imageList.length - 1 ? prev + 1 : prev));
    };

    /**
     * Downloads the currently displayed image to the user's device.
     *
     * @remarks
     * Fetches the image as a `Blob`, creates a temporary object URL, triggers a
     * hidden `<a>` click to initiate the browser download, then revokes the object
     * URL to free memory.
     */
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
