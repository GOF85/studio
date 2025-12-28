'use client';

import React, { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, X, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string>('');
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    const handleDevices = useCallback(
        (mediaDevices: MediaDeviceInfo[]) =>
            setDevices(mediaDevices.filter(({ kind }) => kind === "videoinput")),
        [setDevices]
    );

    React.useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(handleDevices);
    }, [handleDevices]);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setImgSrc(imageSrc);
        }
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
    };

    const confirm = async () => {
        if (imgSrc) {
            try {
                const res = await fetch(imgSrc);
                const blob = await res.blob();
                const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
                onClose();
                setImgSrc(null);
            } catch (e) {
                console.error("Error creating file from camera capture", e);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none text-white">
                <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
                    <DialogTitle className="flex justify-between items-center text-white">
                        <span>Cámara</span>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                            <X className="w-5 h-5" />
                        </Button>
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Captura una foto usando la cámara de tu dispositivo.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative aspect-[3/4] sm:aspect-video bg-black flex items-center justify-center">
                    {imgSrc ? (
                        <img src={imgSrc} alt="Captured" className="w-full h-full object-contain" />
                    ) : (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ deviceId: deviceId ? { exact: deviceId } : undefined, facingMode: 'environment' }}
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                <DialogFooter className="p-4 bg-black/80 backdrop-blur-sm flex flex-row justify-between items-center sm:justify-between gap-4">
                    {imgSrc ? (
                        <>
                            <Button variant="outline" onClick={retake} className="flex-1 border-white/20 text-white hover:bg-white/10 hover:text-white">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Repetir
                            </Button>
                            <Button onClick={confirm} className="flex-1 bg-white text-black hover:bg-white/90">
                                <Check className="w-4 h-4 mr-2" />
                                Usar foto
                            </Button>
                        </>
                    ) : (
                        <>
                            {devices.length > 1 && (
                                <Select value={deviceId} onValueChange={setDeviceId}>
                                    <SelectTrigger className="w-[140px] bg-transparent border-white/20 text-white h-10">
                                        <SelectValue placeholder="Cámara" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {devices.map((device, key) => (
                                            <SelectItem key={key} value={device.deviceId}>
                                                {device.label || `Cámara ${key + 1}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Button
                                onClick={capture}
                                size="icon"
                                className="h-14 w-14 rounded-full border-4 border-white bg-transparent hover:bg-white/20 mx-auto"
                            >
                                <div className="w-10 h-10 rounded-full bg-white" />
                            </Button>

                            {devices.length > 1 && <div className="w-[140px]" />} {/* Spacer */}
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
