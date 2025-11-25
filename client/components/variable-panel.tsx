"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Hash, Box, Layers } from "lucide-react"

interface VariablePanelProps {
  variables: Record<string, any>
  currentStep?: number
}

const getTypeIcon = (value: any) => {
  if (typeof value === 'number') return <Hash className="w-3 h-3 text-blue-400" />
  if (typeof value === 'string') return <Activity className="w-3 h-3 text-green-400" />
  if (Array.isArray(value)) return <Layers className="w-3 h-3 text-yellow-400" />
  if (typeof value === 'object') return <Box className="w-3 h-3 text-purple-400" />
  return <Activity className="w-3 h-3 text-gray-400" />
}

export function VariablePanel({ variables, currentStep }: VariablePanelProps) {
  return (
    <Card className="h-full border-none bg-transparent shadow-none">
      <CardHeader className="pb-2 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Box className="w-4 h-4" />
          Variables
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)] px-4">
          <div className="space-y-2 pb-4">
            <AnimatePresence mode="popLayout">
              {Object.entries(variables).map(([key, value]) => (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30,
                    layout: { duration: 0.2 } 
                  }}
                  className="group relative overflow-hidden rounded-xl border border-border/50 bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        {getTypeIcon(value)}
                        <span className="truncate">{key}</span>
                      </div>
                      <div className="font-mono text-sm text-foreground truncate">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/50">
                      {typeof value}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {Object.keys(variables).length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground text-sm"
              >
                No variables in scope
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
