import { useEffect, useState, useRef } from 'react';
import { COLORS } from '../colors';
import { ColorSwatch, Slider } from '@mantine/core';
import Draggable from 'react-draggable';
import axios from 'axios';
import { CiEraser, CiPen } from "react-icons/ci";
import { AiOutlineClear } from "react-icons/ai";

const Home = () => {
    const canvasRef = useRef(null);
    const [reset, setReset] = useState(false);
    const [color, setColor] = useState('rgb(0,0,0)');
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState();
    const [dictOfVars, setDictOfVars] = useState({});
    const [latexExp, setLatexExp] = useState([]);
    const [latexPos, setLatexPos] = useState({ x: 10, y: 200 });
    const [lineWidth, setLineWidth] = useState(3);
    const [isErasing, setIsErasing] = useState(false);

    const draggableRef = useRef(null);
    const ctxRef = useRef(null);

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ecc';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawHorizontalLines();
            }
        }
    };

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setDictOfVars({});
            setResult();
            setLatexExp([]);
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const resizeCanvas = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                if (ctx) {
                    ctx.lineCap = 'round';
                    ctx.lineWidth = lineWidth;
                    ctx.fillStyle = '#ecc';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    drawHorizontalLines();
                }
            };

            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            return () => {
                window.removeEventListener('resize', resizeCanvas);
            };
        }
    }, []);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;

        script.onload = () => {
            if (window.MathJax) {
                window.MathJax.Hub.Config({
                    tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
                });
                console.log('MathJax loaded and configured');
            }
        };

        script.onerror = () => {
            console.error('Failed to load MathJax script');
        };

        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (latexExp.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExp]);

    const drawHorizontalLines = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const lineHeight = 40;
            const lineColor = '#aaa';
            const lineWidth = 1;

            for (let i = lineHeight; i < canvas.height; i += lineHeight) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = lineWidth;
                ctx.stroke();
            }
        }
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const { offsetX, offsetY } = e.nativeEvent.touches ? 
                getTouchPos(e) : 
                e.nativeEvent;
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY);
            setIsDrawing(true);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const { offsetX, offsetY } = e.nativeEvent.touches ? 
                getTouchPos(e) : 
                e.nativeEvent;
            ctx.strokeStyle = isErasing ? '#ecc' : color;
            ctx.lineWidth = lineWidth;
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
        }
    };

    const getTouchPos = (e) => {
        const rect = e.target.getBoundingClientRect();
        const touch = e.touches[0];
        return {
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top,
        };
    };

    const toggleEraser = () => {
        setIsErasing(!isErasing);
    };

    const sendData = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/calculate`,
                {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                }
            );

            const resp = await response.data;
            resp.data.forEach((data) => {
                if (data.assign === true) {
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result,
                    });
                }
            });

            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width,
                minY = canvas.height,
                maxX = 0,
                maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setLatexPos({ x: centerX, y: centerY });
            resp.data.forEach((data) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result,
                    });
                }, 100);
            });
        }
    };

    const renderLatexToCanvas = (expression, answer) => {
        const latex =  `\\(\\mathsf{\\large{${expression.replace(/ /g, '\\,')}=${answer}}} \\mathsf{}\\)`;
        setLatexExp([...latexExp, latex]);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ecc';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawHorizontalLines();
            }
        }
    };

    return (
        <>
            <div className="top-container">
                <div className="panel">
                    <button onClick={() => setReset(true)}>
                        <AiOutlineClear size={35} />
                    </button>
                    {COLORS.map((swcolor) => (
                        <ColorSwatch
                            key={swcolor}
                            color={swcolor}
                            onClick={() => setColor(swcolor)}
                        />
                    ))}
                    <Slider
                        color="orange"
                        value={lineWidth}
                        onChange={setLineWidth}
                        min={1}
                        max={10}
                        step={1}
                        label={`Line Width: ${lineWidth}`}
                        className="z-10 slider"
                    />
                    <button onClick={toggleEraser} className="eraser">
                        {isErasing ? <CiPen size={40} /> : <CiEraser size={40} />}
                    </button>
                </div>
            </div>
            <button onClick={sendData} className="go-button">
                Go
            </button>
            <canvas
                ref={canvasRef}
                id="canvas"
                className="w-full h-full top-0 left-0 absolute"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
            />
            {latexExp &&
                latexExp.map((latex, index) => (
                    <Draggable
                        key={index}
                        nodeRef={draggableRef}
                        defaultPosition={latexPos}
                        onStop={(e, data) => setLatexPos({ x: data.x, y: data.y })}
                    >
                        <div ref={draggableRef} className="latex-content-container">
                            <div className="latex-content">{latex}</div>
                        </div>
                    </Draggable>
                ))}
        </>
    );
};

export default Home;
