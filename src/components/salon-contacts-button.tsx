import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Contact = { id: string; label: string; phone: string };

export function SalonContactsButton({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("salon_contacts")
        .select("id,label,phone")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setContacts((data ?? []) as Contact[]);
    })();
  }, []);

  if (contacts.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon" aria-label="Call the salon">
          <Phone className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Call the salon</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {contacts.map((c) => (
          <DropdownMenuItem key={c.id} asChild>
            <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="flex flex-col items-start">
              <span className="font-medium">{c.label}</span>
              <span className="text-xs text-muted-foreground">{c.phone}</span>
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
