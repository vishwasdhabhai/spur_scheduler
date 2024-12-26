'use client'

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface ScheduleTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSchedule: (scheduleData: {
    testSuite: string
    startDateTime: string
    weeklySchedule: string[]
    timeZone: string
    frequency: string
  }) => void
}

export function ScheduleTestDialog({
  open,
  onOpenChange,
  onSchedule
}: ScheduleTestDialogProps) {
  const supabase = createClientComponentClient()
  const [selectedSuite, setSelectedSuite] = React.useState("")
  const [startDateTime, setStartDateTime] = React.useState("")
  const [selectedDays, setSelectedDays] = React.useState<string[]>([])
  const [timeZone, setTimeZone] = React.useState("")
  const [frequency, setFrequency] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const weekDays = [
    { label: "Sun", value: "sunday" },
    { label: "Mon", value: "monday" },
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" }
  ]

  const convertUTCtoPST = (utcDateTimeStr: string): string => {
    try {
      // Create a UTC date from the input string
      const utcDate = new Date(utcDateTimeStr);
      
      // Convert to PST (UTC-8)
      const pstTime = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
      
      // Format the date for Supabase timestamptz
      // Format: YYYY-MM-DD HH:mm:ss+00
      const year = pstTime.getUTCFullYear();
      const month = String(pstTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(pstTime.getUTCDate()).padStart(2, '0');
      const hours = String(pstTime.getUTCHours()).padStart(2, '0');
      const minutes = String(pstTime.getUTCMinutes()).padStart(2, '0');
      const seconds = String(pstTime.getUTCSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}-08:00`;
    } catch (error) {
      console.error('Error converting time:', error);
      throw new Error('Invalid date format');
    }
  }

  const handleSave = async () => {
    try {
      if (!selectedSuite || !startDateTime || !timeZone || !frequency || selectedDays.length === 0) {
        setError('Please fill in all required fields');
        return;
      }

      let adjustedDateTime = startDateTime;
      let finalTimeZone = timeZone;

      // Convert time if timezone is UTC
      if (timeZone === 'UTC') {
        try {
          adjustedDateTime = convertUTCtoPST(startDateTime);
          finalTimeZone = 'PST';
          console.log('Original UTC DateTime:', startDateTime);
          console.log('Converted PST DateTime:', adjustedDateTime);
        } catch (err) {
          setError('Error converting time. Please check the format.');
          return;
        }
      }

      // Format for database insertion
      const scheduleData = {
        user_id: '078d94a6-4161-428f-9cec-efb081ce2e5a',
        title: selectedSuite,
        time: adjustedDateTime,
        time_zone: finalTimeZone,
        frequency: frequency,
        weekday: selectedDays
      };

      console.log('Sending to Supabase:', scheduleData);

      const { data, error: supabaseError } = await supabase
        .from('scheduler')
        .insert([scheduleData]);

      if (supabaseError) {
        console.error('Supabase Error:', supabaseError);
        setError(supabaseError.message);
        return;
      }

      
      onSchedule({
        testSuite: selectedSuite,
        startDateTime,
        weeklySchedule: selectedDays,
        timeZone,
        frequency
      });

      console.log('Successfully saved schedule:', data);
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving the schedule';
      setError(errorMessage);
      console.error('Save Error:', err);
    }
  }

  const toggleDay = (day: string) => {
    setSelectedDays(current =>
      current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Schedule Detail</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
            <button
              className="absolute top-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Suite</label>
            <Select value={selectedSuite} onValueChange={setSelectedSuite}>
              <SelectTrigger>
                <SelectValue placeholder="Demo Suite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Demo Suite</SelectItem>
                <SelectItem value="regression">Regression Suite</SelectItem>
                <SelectItem value="smoke">Smoke Tests</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date and Time</label>
            <div className="relative">
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Time Zone</label>
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger>
                <SelectValue placeholder="Select Time Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="PST">PST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Frequency</label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue placeholder="Select Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Run Weekly on Every</label>
              <Button
                variant="link"
                className="text-sm text-gray-500"
                onClick={() => {/* Implement custom interval logic */}}
              >
                Custom Interval
              </Button>
            </div>
            <div className="flex gap-2">
              {weekDays.map((day) => (
                <Button
                  key={day.value}
                  variant="outline"
                  className={cn(
                    "flex-1 p-2",
                    selectedDays.includes(day.value) && "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onOpenChange(false)}
          >
            Cancel Schedule
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}




