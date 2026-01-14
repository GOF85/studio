'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimePickerWheelProps {
  value: string; // "HH:MM"
  onValueChange: (value: string) => void;
  onClose: () => void;
}

export function TimePickerWheel({ value, onValueChange, onClose }: TimePickerWheelProps) {
  const [hours, setHours] = useState(value.split(':')[0] || '10');
  const [minutes, setMinutes] = useState(value.split(':')[1] || '00');
  
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const hoursArray = Array.from({ length: 15 }, (_, i) => String(8 + i).padStart(2, '0'));
  const minutesArray = ['00', '15', '30', '45'];

  const itemHeight = 44; // Altura de cada item

  useEffect(() => {
    // Scroll inicial para centrar la hora seleccionada
    if (hoursRef.current) {
      const index = hoursArray.indexOf(hours);
      if (index !== -1) {
        hoursRef.current.scrollTop = index * itemHeight;
      }
    }
    if (minutesRef.current) {
      const index = minutesArray.indexOf(minutes);
      if (index !== -1) {
        minutesRef.current.scrollTop = index * itemHeight;
      }
    }
  }, [hours, minutes]);

  const handleHourScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(index, hoursArray.length - 1));
    setHours(hoursArray[clamped]);
  };

  const handleMinuteScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(index, minutesArray.length - 1));
    setMinutes(minutesArray[clamped]);
  };

  const handleConfirm = () => {
    onValueChange(`${hours}:${minutes}`);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-2xl w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Selecciona hora</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-4">
          {/* Horas */}
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase block mb-3 text-center text-gray-700 dark:text-gray-300">Horas</label>
            <div 
              ref={hoursRef}
              onScroll={handleHourScroll}
              className="h-44 overflow-y-scroll border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800"
              style={{
                scrollBehavior: 'smooth',
                overscrollBehavior: 'contain',
              }}
            >
              {hoursArray.map((hour) => (
                <div
                  key={hour}
                  className={`h-11 flex items-center justify-center text-xl font-bold transition-all cursor-pointer ${
                    hour === hours
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setHours(hour);
                    if (hoursRef.current) {
                      const index = hoursArray.indexOf(hour);
                      hoursRef.current.scrollTop = index * itemHeight;
                    }
                  }}
                >
                  {hour}
                </div>
              ))}
            </div>
          </div>

          {/* Minutos */}
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase block mb-3 text-center text-gray-700 dark:text-gray-300">Minutos</label>
            <div 
              ref={minutesRef}
              onScroll={handleMinuteScroll}
              className="h-44 overflow-y-scroll border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800"
              style={{
                scrollBehavior: 'smooth',
                overscrollBehavior: 'contain',
              }}
            >
              {minutesArray.map((minute) => (
                <div
                  key={minute}
                  className={`h-11 flex items-center justify-center text-xl font-bold transition-all cursor-pointer ${
                    minute === minutes
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setMinutes(minute);
                    if (minutesRef.current) {
                      const index = minutesArray.indexOf(minute);
                      minutesRef.current.scrollTop = index * itemHeight;
                    }
                  }}
                >
                  {minute}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 h-10">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            Guardar {hours}:{minutes}
          </Button>
        </div>
      </div>
    </div>
  );
}
