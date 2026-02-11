
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { useStore, CalendarEvent } from '../store/useStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Calendar = () => {
  const { calendarEvents: allEvents, addCalendarEvent, deleteCalendarEvent, toggleEventCompletion, activeProfileId } = useStore();
  
  const calendarEvents = useMemo(() => allEvents.filter(e => !e.profileId || e.profileId === activeProfileId), [allEvents, activeProfileId]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<CalendarEvent['type']>('study');
  const [eventTime, setEventTime] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    setIsModalOpen(true);
    // Reset form
    setEventTitle('');
    setEventType('study');
    setEventTime('09:00');
    setEventDesc('');
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !eventTitle.trim()) return;

    addCalendarEvent({
      title: eventTitle,
      date: selectedDate.getTime(),
      type: eventType,
      completed: false,
      time: eventTime,
      description: eventDesc
    });
    setIsModalOpen(false);
  };

  const getEventsForDate = (day: number) => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).setHours(0,0,0,0);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).setHours(23,59,59,999);
    
    return calendarEvents.filter(e => e.date >= start && e.date <= end);
  };

  const getUpcomingEvents = () => {
    const now = new Date().setHours(0,0,0,0);
    return calendarEvents
      .filter(e => e.date >= now && !e.completed)
      .sort((a, b) => a.date - b.date)
      .slice(0, 5); // Show next 5
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 sm:h-32 bg-secondary/10 border border-border/40" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = 
        day === new Date().getDate() && 
        currentDate.getMonth() === new Date().getMonth() && 
        currentDate.getFullYear() === new Date().getFullYear();
      
      const dayEvents = getEventsForDate(day);

      days.push(
        <div 
          key={day} 
          onClick={() => handleDateClick(day)}
          className={`h-24 sm:h-32 border border-border/40 p-2 relative group hover:bg-secondary/20 transition-colors cursor-pointer ${isToday ? 'bg-primary/5' : ''}`}
        >
          <div className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
            {day}
          </div>
          
          <div className="mt-2 space-y-1 overflow-y-auto max-h-[calc(100%-2rem)] scrollbar-hide">
            {dayEvents.slice(0, 3).map(event => (
              <div 
                key={event.id}
                className={`text-[10px] px-1.5 py-0.5 rounded truncate border-l-2 ${
                  event.type === 'exam' ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400' :
                  event.type === 'quiz' ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400' :
                  event.type === 'assignment' ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400' :
                  'bg-green-500/10 border-green-500 text-green-600 dark:text-green-400'
                } ${event.completed ? 'opacity-50 line-through' : ''}`}
              >
                {event.time && <span className="mr-1 opacity-70">{event.time}</span>}
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-[10px] text-muted-foreground pl-1">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={14} className="text-muted-foreground" />
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-6 p-6 overflow-hidden">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col bg-card border rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">
              {MONTHS[currentDate.getMonth()]} <span className="text-muted-foreground">{currentDate.getFullYear()}</span>
            </h2>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-secondary rounded-full">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-secondary rounded-full">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <Button onClick={() => { setSelectedDate(new Date()); setIsModalOpen(true); }} size="sm">
            <Plus size={16} className="mr-2" /> Add Event
          </Button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 bg-secondary/30 border-b">
          {DAYS.map(day => (
            <div key={day} className="py-2 text-center text-sm font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto">
          {renderCalendarGrid()}
        </div>
      </div>

      {/* Sidebar: Upcoming & Due */}
      <div className="w-80 flex flex-col gap-6">
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex-1 flex flex-col">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Upcoming
            </h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                {getUpcomingEvents().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No upcoming events.
                    </div>
                ) : (
                    getUpcomingEvents().map(event => (
                        <div key={event.id} className="group p-3 rounded-xl border bg-secondary/10 hover:bg-secondary/20 transition-all flex items-start gap-3">
                             <div 
                                className="mt-1 cursor-pointer" 
                                onClick={() => toggleEventCompletion(event.id)}
                            >
                                {event.completed ? (
                                    <CheckCircle size={18} className="text-green-500" />
                                ) : (
                                    <Circle size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                )}
                             </div>
                             <div className="flex-1 min-w-0">
                                <h4 className={`font-medium text-sm truncate ${event.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {event.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span className={`capitalize px-1.5 py-0.5 rounded-full ${
                                        event.type === 'exam' ? 'bg-red-500/10 text-red-500' :
                                        event.type === 'quiz' ? 'bg-orange-500/10 text-orange-500' :
                                        event.type === 'assignment' ? 'bg-blue-500/10 text-blue-500' :
                                        'bg-green-500/10 text-green-500'
                                    }`}>
                                        {event.type}
                                    </span>
                                    {event.time && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} /> {event.time}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(event.date).toLocaleDateString()}
                                </div>
                             </div>
                             <button 
                                onClick={() => deleteCalendarEvent(event.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all"
                            >
                                <Trash2 size={14} />
                             </button>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Event">
        <form onSubmit={handleAddEvent} className="space-y-4">
            <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input 
                    value={eventTitle} 
                    onChange={(e) => setEventTitle(e.target.value)} 
                    placeholder="e.g. Biology Exam" 
                    autoFocus
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">Type</label>
                    <select 
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value as CalendarEvent['type'])}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="study">Study Session</option>
                        <option value="assignment">Assignment</option>
                        <option value="quiz">Quiz</option>
                        <option value="exam">Exam</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Time (Optional)</label>
                    <Input 
                        type="time"
                        value={eventTime} 
                        onChange={(e) => setEventTime(e.target.value)} 
                    />
                </div>
            </div>

            <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <div className="p-2 border rounded-md bg-secondary/10 text-sm text-muted-foreground">
                    {selectedDate?.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div>
                <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
                <textarea 
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Add details..."
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">Add Event</Button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default Calendar;
