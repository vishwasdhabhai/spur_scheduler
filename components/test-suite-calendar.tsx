'use client'

import * as React from "react"
import { ScheduleTestDialog } from "./testscheduler"
import { addDays, format, startOfWeek, isSameDay } from "date-fns"
import { ChevronLeft, ChevronRight, CalendarIcon, AlignJustify } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toZonedTime } from 'date-fns-tz'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { v4 as uuidv4 } from 'uuid'

interface SchedulerRecord {
  user_id: string
  title: string
  time: string
  time_zone: string
  frequency: string
  weekday: string
}

interface TestSuite {
  id: string
  name: string
  datetime: Date
}

interface TestSuiteCalendarProps {
  initialEvents?: TestSuite[]
}

export function TestSuiteCalendar({ initialEvents = [] }: TestSuiteCalendarProps) {
  const [selectedDate, setSelectedDate] = React.useState(new Date())
  const [view, setView] = React.useState<'calendar' | 'list'>('calendar')
  const [events, setEvents] = React.useState<TestSuite[]>(initialEvents)
  const supabase = createClientComponentClient()

  
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false)

  
  const fetchSchedulerData = async () => {
    try {
      const { data: schedulerData, error } = await supabase
        .from('scheduler')
        .select('*')
      
      if (error) throw error

      if (schedulerData) {
        
        const transformedEvents: TestSuite[] = schedulerData.map((record: SchedulerRecord) => ({
          id: uuidv4(), 
          name: record.title,
          datetime: new Date(record.time) 
        }))

        setEvents(transformedEvents)
      }
    } catch (error) {
      console.error('Error fetching scheduler data:', error)
    }
  }

  
  React.useEffect(() => {
    fetchSchedulerData()
  }, [])

  
  const handleSchedule = async (scheduleData: {
    testSuite: string
    startDateTime: string
    weeklySchedule: string[]
  }) => {
    // Handle the scheduling logic here
    try {
      const { error } = await supabase
        .from('scheduler')
        .insert([
          {
            title: scheduleData.testSuite,
            time: scheduleData.startDateTime,
            weekday: scheduleData.weeklySchedule.join(','),
           
          }
        ])

      if (error) throw error

     
      fetchSchedulerData()
    } catch (error) {
      console.error('Error scheduling test:', error)
    }
  }
  
  const weekStart = startOfWeek(selectedDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1] // 1 AM to 1 PM

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(current => 
      addDays(current, direction === 'prev' ? -7 : 7)
    )
  }

  const formatHour = (hour: number, index: number) => {
    if (index === hours.length - 1) return `${hour} PM`
    return `${hour} ${hour === 12 ? 'PM' : 'AM'}`
  }

  const formatToPST = (date: Date) => {
    // Convert UTC to PST (America/Los_Angeles)
    const zonedDate = toZonedTime(date, 'America/Los_Angeles')
    return format(zonedDate, 'h:mm a')
  }

  return (
    <Card className="max-w-[1600px] w-full mx-auto">
      <CardHeader>
        <CardTitle className="mb-4">Scheduled Suites</CardTitle>
        <div className="flex items-center gap-4">
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setScheduleDialogOpen(true)}>
            + Schedule Test
          </Button>
          <div className="flex items-center bg-white border rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateWeek('prev')}
              className="hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2">
              Week of {format(weekStart, 'MM/dd/yy')}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateWeek('next')}
              className="hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="ml-auto">
            <div className="inline-flex items-center rounded-lg bg-gray-100/80 p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-state={view === 'list' ? 'active' : undefined}
                onClick={() => setView('list')}
              >
                <AlignJustify className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-state={view === 'calendar' ? 'active' : undefined}
                onClick={() => setView('calendar')}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        
        <div className="grid grid-cols-[4.5rem,1fr]">
          
          <div className="pr-4">
            <div className="relative h-12">
                <span className="absolute right-0 -bottom-2.5 text-sm text-gray-500">
                    PST
                </span>
            </div>
            {hours.map((hour, index) => (
              <div
                key={`hour-${hour}-${index}`}
                className="relative h-20"
              >
                <span className="absolute right-0 -bottom-2.5 text-sm text-gray-500">
                  {formatHour(hour, index)}
                </span>
              </div>
            ))}
          </div>

          
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <div className="grid grid-cols-7">
              {/* Day headers */}
              {days.map((day, index) => (
                <div
                  key={`day-header-${index}`}
                  className={cn(
                    "h-12 border-b border-r border-gray-100 bg-gray-50/80 px-4 py-3 flex items-baseline gap-10",
                    index === days.length - 1 && "border-r-0"
                  )}
                >
                  <span className="text-xl font-sm">
                    {format(day, 'd')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(day, 'EEE')}
                  </span>
                </div>
              ))}

              
              {hours.map((hour, hourIndex) => (
                <React.Fragment key={`hour-slot-${hour}-${hourIndex}`}>
                  {days.map((day, dayIndex) => {
                    const dayEvents = events.filter(event => 
                      isSameDay(event.datetime, day) && 
                      new Date(event.datetime).getHours() === (hourIndex === hours.length - 1 ? 13 : hour)
                    )

                    return (
                      <div
                        key={`day-${dayIndex}-hour-${hourIndex}`}
                        className={cn(
                          "relative h-20 border-b border-r border-gray-100 p-1",
                          dayIndex === days.length - 1 && "border-r-0",
                          hourIndex === hours.length - 1 && "border-b-0"
                        )}
                      >
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="absolute inset-x-1 rounded bg-blue-50 p-2"
                            style={{
                              top: '0.25rem',
                            }}
                          >
                            <div className="text-sm font-medium text-blue-700">
                              {event.name}
                            </div>
                            <div className="text-xs text-blue-600 flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-current" />
                              {formatToPST(event.datetime)} PST
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <ScheduleTestDialog 
        open={scheduleDialogOpen} 
        onOpenChange={setScheduleDialogOpen} 
        onSchedule={handleSchedule}
      />
    </Card>
  )
}







