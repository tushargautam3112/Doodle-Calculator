import { useEffect, useState, useRef } from 'react';
import { COLORS } from '../../../constants';
import { ColorSwatch, Group, Slider } from '@mantine/core';
import Draggable from 'react-draggable';
import axios from 'axios';

const Home = () => {
    const canvasRef = useRef(null);
    const [reset, setReset] = useState(false);
    const [color, setColor] = useState('rgb(0,0,0)');
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState();
    const [dictOfVars, setDictOfVars] = useState({});
    const [latexExp, setLatexExp] = useState([]);
    const [latexPos, setLatexPos] = useState({x: 10, y: 200});
    const [lineWidth, setLineWidth] = useState(3); // State for line thickness
    const [isErasing, setIsErasing] = useState(false); // State for eraser mode

    const draggableRef = useRef(null); // Ref for draggable content
    const ctxRef = useRef(null); // Ref for the canvas context

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ecc';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
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
                    ctx.lineWidth = lineWidth; // Set initial line width
                    ctx.fillStyle = '#ecc';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            };

            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            return () => {
                window.removeEventListener('resize', resizeCanvas);
            };
        }
    }, []); // Only run once on mount to initialize the canvas

    useEffect(() => {
        // Dynamically load MathJax script
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

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
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
            ctx.strokeStyle = isErasing ? '#ecc' : color; // If erasing, draw with background color
            ctx.lineWidth = lineWidth; // Use the selected line width
            ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            ctx.stroke();
        }
    };

    const toggleEraser = () => {
        setIsErasing(!isErasing); // Toggle eraser mode
    };

    const sendData = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
            console.log('Sending data...', `${import.meta.env.VITE_API_URL}/calculate`);
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                },
            });

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
        // Add spaces explicitly in the expression and answer
        const latex = `\\(\\mathsf{\\large{${expression.replace(/ /g, '\\,')}=${answer}}} \\mathsf{}\\)`;
    
        setLatexExp([...latexExp, latex]);
    
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ecc';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    return (
        <>
            <div className="z-10 flex">
                <Group className="z-10 inline panel">
                    <button onClick={() => setReset(true)} className="z-10 bg-slate-400">
                        Clear
                    </button>
                    {COLORS.map((swcolor) => {
                        return (
                            <ColorSwatch
                                key={swcolor}
                                color={swcolor}
                                onClick={() => setColor(swcolor)}
                            />
                        );
                    })}
                    <button onClick={toggleEraser} className="z-10">
                        {isErasing ? 'Switch to Drawing' : 'Eraser'}
                    </button>
                    <Slider
                        value={lineWidth}
                        onChange={setLineWidth}
                        min={1}
                        max={10}
                        step={1}
                        label={`Line Width: ${lineWidth}`}
                        className="z-10 slider"
                    />
                    <button onClick={sendData} className="z-10">
                        Calculate
                    </button>
                </Group>
            </div>
            <canvas
                ref={canvasRef}
                id="canvas"
                className="w-full h-full top-0 left-0 absolute"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
            />
            {latexExp &&
                latexExp.map((latex, index) => (
                    <Draggable
                        key={index}
                        nodeRef={draggableRef}
                        defaultPosition={latexPos}
                        onStop={(e, data) => setLatexPos({ x: data.x, y: data.y })}
                    >
                        <div ref={draggableRef} className="latex-content">
                            <div className="latex-content">{latex}</div>
                        </div>
                    </Draggable>
                ))}
        </>
    );
};

export default Home;
