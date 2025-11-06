'use client'

interface AvailabilitySchedule {
  [key: string]: {
    start: string;
    end: string;
    available: boolean;
  };
}

interface AvailabilityDisplayProps {
  availability: AvailabilitySchedule;
  className?: string;
}

export function AvailabilityDisplay({ availability, className = "" }: AvailabilityDisplayProps) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAvailabilitySummary = () => {
    const availableDays = days.filter(day => availability[day]?.available);
    const unavailableDays = days.filter(day => !availability[day]?.available);
    
    if (availableDays.length === 7) return 'Available 7 days a week';
    if (availableDays.length === 0) return 'Not available';
    if (availableDays.length === 5 && unavailableDays.includes('saturday') && unavailableDays.includes('sunday')) {
      return 'Weekdays only';
    }
    
    return `${availableDays.length} days per week`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-gray-700">
        📅 {getAvailabilitySummary()}
      </div>
      
      <div className="grid grid-cols-1 gap-1 text-xs">
        {days.map((day) => {
          const schedule = availability[day];
          if (!schedule?.available) return null;
          
          return (
            <div key={day} className="flex justify-between items-center text-gray-600">
              <span className="capitalize">{day}</span>
              <span className="text-gray-500">
                {formatTime(schedule.start)} - {formatTime(schedule.end)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

