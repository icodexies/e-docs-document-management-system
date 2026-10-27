import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const SignaturePad = forwardRef(function SignaturePad({ disabled = false }, ref) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));

      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(ratio, ratio);
      context.lineWidth = 2.6;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#0b1330";
    }

    resize();

    const handleResize = () => {
      resize();
      setEmpty(true);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function point(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event) {
    if (disabled) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    canvas.setPointerCapture?.(event.pointerId);
    drawingRef.current = true;
    const position = point(event);
    context.beginPath();
    context.moveTo(position.x, position.y);
    setEmpty(false);
  }

  function move(event) {
    if (!drawingRef.current || disabled) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const position = point(event);
    context.lineTo(position.x, position.y);
    context.stroke();
  }

  function end(event) {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    canvas?.releasePointerCapture?.(event.pointerId);
  }

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    setEmpty(true);
  }, []);

  const toBlob = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || empty) return null;
    return await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
  }, [empty]);

  useImperativeHandle(
    ref,
    () => ({ clear, toBlob, isEmpty: () => empty }),
    [clear, toBlob, empty],
  );

  return (
    <div className="space-y-2">
      <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-400 bg-white">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          aria-label="Signature drawing area"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-slate-300"
        />
        <span className="pointer-events-none absolute bottom-2 left-4 text-[10px] font-semibold text-slate-400">
          Sign above the line
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Draw with a mouse, stylus or finger. The drawing is saved as a
        transparent PNG.
      </p>
    </div>
  );
});

export default SignaturePad;
