import { useEffect, useState, useRef } from 'react';
import { COLORS } from '../../../constants';
import { ColorSwatch, Group } from '@mantine/core';
import axios from 'axios';

const Home = () => {
    const canvasRef = useRef(null);
    const [reset, setReset] = useState(false);
    const [color, setColor] = useState('rgb(0,0,0)');
    const [isDrawing, setIsDrawing] = useState(false);
    const [dictOfVars, setDictOfVars] = useState({}); 

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Clear the entire canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Optionally set the background color (e.g., white or transparent)
                ctx.fillStyle = '#ecc'; // Set the background color to white
                ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the canvas with white
            }
        }
    }

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const resizeCanvas = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                if (ctx) {
                    ctx.lineCap = 'round';
                    ctx.lineWidth = 3;
                    ctx.fillStyle = '#ecc';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            };
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            return () => window.removeEventListener('resize', resizeCanvas);
        }
    }, []);

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
            ctx.strokeStyle = color;
            ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            ctx.stroke();
        }
    };

    const sendData = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                }
            });

            const resp = await response.data;
            console.log("response: ", resp);
        }
    };

    return (
        <>
            <div className='z-10 flex'>
                
                <Group className='z-10 inline panel'>
                <button onClick={() => setReset(true)} className='z-10 bg-slate-400'>
                    Clear
                </button>
                    {COLORS.map((swcolor) => {
                        return ( // Add return here to render the ColorSwatch
                            <ColorSwatch
                                key={swcolor}
                                color={swcolor}
                                onClick={() => setColor(swcolor)}
                            />
                        );
                    })}
                    <button onClick={sendData} className='z-10'>
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
        </>
    );
};

export default Home;
