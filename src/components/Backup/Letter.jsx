import React, { useState, useRef, useEffect } from 'react'
import { words } from '../Wordle/Dictionary'
import checkMark from "../../images/checkMark.png?as=png&width=40"
import { colors } from '../Charts/ColorGradients'

export const useLetterBox = props => {
    const { setTabToNext, letter, setLetter, initLetter } = props
    const [letterLocal, setLetterLocal] = useState(initLetter);

    return {
        letter,
        setLetter,
        reset: () => setLetterLocal(""),
        bind: {
            value: letterLocal,
            className: "textbox short tab",
            maxLength: "1",
            type: "text",
            onChange: e => {
                if (e.target.value.toUpperCase().match(/[A-Z]/)) {
                    e.target.value = e.target.value.toUpperCase()
                    setTabToNext()
                } else {
                    e.target.value = ''
                }
                setLetterLocal(e.target.value)
                setLetter(e.target.value)
                console.log("setting v:" + e.target.value + " ll:" + letterLocal + " l:" + letter)

            },
            onFocus: e => {
                console.log("focus " + letterLocal + " " + letter)
                setLetterLocal('')
                e.target.value = ''
                console.log("focus2 " + letterLocal + " " + letter)
            },
            onBlur: e => {
                if (letterLocal === '')
                    setLetterLocal(letter)
                console.log("blur " + letterLocal + " " + letter)
            }
        }
    };
};

export const LetterGroup = ({ hide, inputRef, setTabToNext, letter, setLetter, accuracy, setAccuracy, initLetter }) => {

    const positionRef = useRef(null)
    const letterRef = useRef(null)
    const { bind: bind } = useLetterBox({ setTabToNext: setTabToNext, letter: letter, setLetter: setLetter, initLetter: initLetter });

    const handleCorrectPosition = (e) => {
        // debugger
        if (positionRef.current.checked) {
            setAccuracy(2)
            letterRef.current.checked = false
        } else if (!letterRef.current.checked) {
            setAccuracy(0)
        }
    }

    const handleCorrectLetter = (e) => {
        if (letterRef.current.checked) {
            setAccuracy(1)
            positionRef.current.checked = false
        } else if (!positionRef.current.checked) {
            setAccuracy(0)
        }
    }

    return (
        <div className="vstack gap-3">
            <div><input ref={inputRef} style={{ backgroundColor: accuracy === 0 ? "white" : accuracy === 1 ? "gold" : "lightgreen" }} {...bind} /></div>
            {hide === true ? <></> : <>
                <div style={{ paddingLeft: '6px' }}><input
                    ref={positionRef}
                    type="checkbox"
                    onChange={(e) => { handleCorrectPosition(e) }}
                /></div>
                <div style={{ paddingLeft: '6px' }}><input
                    ref={letterRef}
                    type="checkbox"
                    onChange={(e) => { handleCorrectLetter(e) }}
                /></div>
            </>
            }
        </div>
    )
}

export const Word = props => {
    const { startWord, nextWord, completeList, PossibleWordList, setPossibleWordList } = props

    const [isAWord, setIsAWord] = useState(false);
    const [tabToNext, setTabToNext] = useState('-1');
    const [letters, setLetters] = useState(["", "", "", "", ""]);
    const [hide, setHide] = useState(false);
    const [accuracies, setAccuracies] = useState([0, 0, 0, 0, 0]);

    const btnRef = useRef(null)
    const letterRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)]

    useEffect(() => {
        lookupWord(letters.join(''))
    })


    useEffect(() => {
        setLetters(startWord.split(''))
        letterRefs.forEach((v, i) => {
            // v.current.init()
            // debugger
        })
    }, [])

    const lookupWord = (w) => {
        if (w.length === 5) {
            for (let i = 0; i < completeList.length; i++) {
                if (completeList[i] === w) {
                    setIsAWord(true)
                    if (btnRef.current) btnRef.current.focus()
                    return (true)
                }
            }
        }
        setIsAWord(false)
        if (tabToNext >= 0) {
            letterRefs[tabToNext < 4 ? tabToNext + 1 : 0].current.focus()
            setTabToNext(-1)
        }

        return (false)
    }


    const letterAtPos = (pos, words) => {
        var t = [], nt = []
        for (let i = 0; i < words.length; i++) {
            if (words[i].slice(pos, pos + 1) === letters[pos]) {
                t.push(words[i])
            } else {
                nt.push(words[i])
            }
        }
        return ([t, nt])
    }

    const letterInWord = (pos, words, withLetter) => {
        var t = []
        const l = letters[pos]
        for (let i = 0; i < words.length; i++) {
            //letter in word but NOT at pos
            if (withLetter === 1 && words[i].match(l) && words[i].slice(pos, pos + 1) !== letters[pos]) {
                t.push(words[i])
            }
            if (withLetter === 0 && !words[i].match(l)) {
                t.push(words[i])
            }

        }
        return (t)
    }

    const find = () => {
        let w = PossibleWordList
        for (let i = 0; i < letters.length; i++) {
            if (accuracies[i] === 2) {
                w = letterAtPos(i, w)[0]
            }
        }
        for (let i = 0; i < letters.length; i++) {
            if (accuracies[i] !== 2) {
                w = letterInWord(i, w, accuracies[i])

            }
        }
        setPossibleWordList(w)
        setHide(true)
        nextWord(w)
    }

    return (
        <>
            <table style={{ tableLayout: 'fixed', width: '250px' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '60px', paddingRight: '10px' }}>
                            {isAWord ? <img alt='' src={checkMark} width="40" /> : <></>}
                        </td>
                        {letters.map((l, i) => {
                            return (
                                <td key={i} style={{ width: '40px' }}>
                                    <LetterGroup
                                        inputRef={letterRefs[i]}
                                        initLetter={startWord.split('')[i]}
                                        setTabToNext={
                                            () => {
                                                setIsAWord(false)
                                                setTabToNext(i)
                                            }
                                        }
                                        letter={letters[i]}
                                        setLetter={
                                            (a) => {
                                                var l = [...letters]
                                                l[i] = a
                                                setLetters(l)
                                            }
                                        }
                                        accuracy={accuracies[i]}
                                        setAccuracy={
                                            (a) => {
                                                var l = [...accuracies]
                                                l[i] = a
                                                setAccuracies(l)
                                            }
                                        }
                                        hide={hide}
                                    />
                                </td>)
                        })}
                        <td>
                            {hide === true ? <></> : <>
                                <button
                                    onClick={find}
                                    ref={btnRef}
                                    disabled={!isAWord}
                                >Go</button>
                            </>}
                        </td>

                    </tr>
                </tbody>
            </table>
        </>
    )
}

