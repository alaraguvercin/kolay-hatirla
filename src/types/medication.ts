export type Medication = {
  id: string;           
  userId: string;       
  name: string;         
  dosage: string;       
  frequencyPerDay: number; 
  times: string[];      
  startDate: string;    
  endDate?: string;     
  notes?: string;       
  isActive: boolean;    
  createdAt: number;    
  updatedAt: number;    
};

export type MedicationDose = {
  id: string;               
  userId: string;          
  medicationId: string;     
  scheduledTime: string;    
  date: string;            
  takenAt?: number;         
};




