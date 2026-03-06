"use client"
import React from 'react'
import {ActivityCalendar} from "react-activity-calendar";
import { useTheme } from 'next-themes';
import { getContributionStats } from '../actions';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const ContributionGraph = () => {
    const { resolvedTheme } = useTheme();

    const { data, isLoading } = useQuery({
        queryKey:["contribution-graph"],
        queryFn:async()=>await getContributionStats(),
        staleTime:1000 * 60 * 5,
    })

    if (isLoading) {
        return (
            <div className='w-full space-y-3 p-2'>
                <div className='flex gap-1'>
                    {Array.from({ length: 53 }).map((_, i) => (
                        <div key={i} className='flex flex-col gap-1'>
                            {Array.from({ length: 7 }).map((_, j) => (
                                <Skeleton
                                    key={j}
                                    className='h-3 w-3 rounded-sm'
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <Skeleton className='h-3 w-48' />
            </div>
        )
    }

    if(!data || data.contributions.length === 0){
        return <div className='w-full flex flex-col items-center justify-center p-8'>
            <p className='text-sm text-muted-foreground'>No contributions found.</p>
        </div>
    }

  return (
    <div className='w-full overflow-auto rounded-lg p-4'>
        <div className='w-full min-w-175'>
            <ActivityCalendar
                data={data.contributions}
                theme={{
                    light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
                    dark:  ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
                }}
                colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
                labels={{
                    totalCount: "{{count}} contributions in the last year",
                }}
                renderBlock={(block, activity) =>
                    React.cloneElement(block, {
                        title: `${activity.count} contribution${activity.count !== 1 ? "s" : ""} on ${activity.date}`,
                        style: { cursor: "pointer", transition: "opacity 0.15s ease", ...block.props.style },
                        onMouseEnter: (e: React.MouseEvent<SVGRectElement>) => {
                            (e.currentTarget as SVGRectElement).style.opacity = "0.75";
                        },
                        onMouseLeave: (e: React.MouseEvent<SVGRectElement>) => {
                            (e.currentTarget as SVGRectElement).style.opacity = "1";
                        },
                    })
                }
            />
        </div>
    </div>
  )
}

export default ContributionGraph
