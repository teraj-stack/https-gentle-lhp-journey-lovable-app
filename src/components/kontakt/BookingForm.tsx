import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const locations = [
  "Warszawa Wilanów",
  "Beauty & Mind Siedlce",
  "IP Cliniq – Rzeszów",
  "Fimedica – Warszawa",
];

const timeSlots = Array.from({ length: 13 }, (_, i) => {
  const hour = 8 + i;
  return `${hour.toString().padStart(2, "0")}:00`;
});

const bookingSchema = z.object({
  location: z.string().min(1, "Wybierz lokalizację"),
  date: z.date({ required_error: "Wybierz datę" }),
  time: z.string().min(1, "Wybierz godzinę"),
  name: z.string().trim().min(1, "Imię jest wymagane").max(100),
  email: z.string().trim().email("Nieprawidłowy adres e-mail").max(255),
  phone: z.string().trim().min(1, "Telefon jest wymagany").max(20),
  message: z.string().trim().max(2000).optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

const BookingForm = () => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = { location, date, time, name, email, phone, message: message || undefined };
    const result = bookingSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSending(true);
    const id = crypto.randomUUID();
    const appointmentDate = format(result.data.date, "yyyy-MM-dd");

    try {
      const { error } = await supabase.from("bookings").insert({
        id,
        location: result.data.location,
        patient_name: result.data.name,
        patient_email: result.data.email,
        patient_phone: result.data.phone,
        appointment_date: appointmentDate,
        appointment_time: result.data.time,
        message: result.data.message || null,
      });

      if (error) throw error;

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "booking-confirmation",
          recipientEmail: result.data.email,
          idempotencyKey: `booking-confirm-${id}`,
          templateData: {
            name: result.data.name,
            location: result.data.location,
            date: format(result.data.date, "d MMMM yyyy", { locale: pl }),
            time: result.data.time,
          },
        },
      });

      setLocation("");
      setDate(undefined);
      setTime("");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setErrors({});

      toast({
        title: "Rezerwacja wysłana",
        description: "Potwierdzenie zostanie wysłane na podany adres e-mail.",
      });
    } catch (err) {
      console.error("Booking failed:", err);
      toast({
        title: "Błąd",
        description: "Nie udało się wysłać rezerwacji. Spróbuj ponownie.",
        variant: "destructive",
      });
    }

    setSending(false);
  };

  const clearError = (field: string) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 md:p-10 max-w-2xl mx-auto space-y-6">
      {/* Lokalizacja */}
      <div className="space-y-2">
        <Label className="text-foreground text-sm">Lokalizacja</Label>
        <Select
          value={location}
          onValueChange={(v) => {
            setLocation(v);
            clearError("location");
          }}
        >
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Wybierz lokalizację" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
      </div>

      {/* Data i godzina */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-foreground text-sm">Data wizyty</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-background border-border",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "d MMMM yyyy", { locale: pl }) : "Wybierz datę"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  clearError("date");
                }}
                disabled={(d) => d < tomorrow || d.getDay() === 0}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground text-sm">Godzina</Label>
          <Select
            value={time}
            onValueChange={(v) => {
              setTime(v);
              clearError("time");
            }}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Wybierz godzinę" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
        </div>
      </div>

      {/* Dane pacjenta */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="booking-name" className="text-foreground text-sm">Imię i nazwisko</Label>
          <Input
            id="booking-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            placeholder="Jan Kowalski"
            className="bg-background border-border"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="booking-phone" className="text-foreground text-sm">Telefon</Label>
          <Input
            id="booking-phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearError("phone");
            }}
            placeholder="+48 600 000 000"
            className="bg-background border-border"
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-email" className="text-foreground text-sm">E-mail</Label>
        <Input
          id="booking-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError("email");
          }}
          placeholder="jan@example.com"
          className="bg-background border-border"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-message" className="text-foreground text-sm">
          Dodatkowe informacje <span className="text-muted-foreground">(opcjonalne)</span>
        </Label>
        <Textarea
          id="booking-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Opisz problem lub dodaj uwagi…"
          rows={3}
          className="bg-background border-border resize-none"
        />
      </div>

      <Button variant="hero" size="lg" type="submit" className="w-full" disabled={sending}>
        {sending ? "Rezerwuję…" : "Zarezerwuj wizytę"}
      </Button>
    </form>
  );
};

export default BookingForm;
