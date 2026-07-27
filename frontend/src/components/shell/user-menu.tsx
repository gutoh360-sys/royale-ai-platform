"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, LogOut, User } from "lucide-react";

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted">
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            AD
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">Admin</p>
          <p className="text-xs text-muted-foreground">admin@royale.ai</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="size-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="size-4" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
